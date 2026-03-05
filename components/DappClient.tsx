"use client";

import { FormEvent, useMemo, useState } from "react";
import { BrowserProvider, Contract, ethers } from "ethers";
import { BSC_CHAIN_ID, ESCROW_CONTRACT_ADDRESS, WYDA_TOKEN_ADDRESS } from "@/lib/config";
import { wydaEscrowAbi } from "@/lib/abis";

type Tier = {
  id: number;
  name: string;
  monthlyAmount: string;
  perks: string;
  active: boolean;
};

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export default function DappClient() {
  const [wallet, setWallet] = useState<string>("");
  const [creator, setCreator] = useState<string>("");
  const [tierId, setTierId] = useState("0");
  const [amount, setAmount] = useState("0");
  const [tierName, setTierName] = useState("");
  const [tierPerks, setTierPerks] = useState("");
  const [status, setStatus] = useState("지갑을 연결하고 후원을 시작하세요.");
  const [tiers, setTiers] = useState<Tier[]>([]);

  const shortWallet = useMemo(() => {
    if (!wallet) return "미연결";
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  }, [wallet]);

  async function connectWallet() {
    if (!window.ethereum) {
      setStatus("메타마스크가 필요합니다.");
      return;
    }

    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();

    if (Number(network.chainId) !== BSC_CHAIN_ID) {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${BSC_CHAIN_ID.toString(16)}` }],
      });
    }

    setWallet(await signer.getAddress());
    setStatus("BSC 메인넷에 연결되었습니다.");
  }

  function getContracts() {
    if (!window.ethereum) throw new Error("EIP-1193 provider가 없습니다.");
    const provider = new BrowserProvider(window.ethereum);

    return provider.getSigner().then((signer) => {
      const escrow = new Contract(ESCROW_CONTRACT_ADDRESS, wydaEscrowAbi, signer);
      const wyda = new Contract(
        WYDA_TOKEN_ADDRESS,
        [
          "function approve(address spender, uint256 amount) external returns (bool)",
          "function decimals() external view returns (uint8)",
        ],
        signer,
      );
      return { escrow, wyda };
    });
  }

  async function handleAddTier(e: FormEvent) {
    e.preventDefault();
    try {
      const { escrow } = await getContracts();
      const monthly = ethers.parseUnits(amount, 18);
      const tx = await escrow.addTier(tierName, monthly, tierPerks);
      await tx.wait();
      setStatus("새 등급이 등록되었습니다.");
    } catch (error) {
      setStatus(`등급 생성 실패: ${(error as Error).message}`);
    }
  }

  async function handleSponsor() {
    try {
      const { escrow, wyda } = await getContracts();
      const parsedAmount = ethers.parseUnits(amount, 18);
      const approveTx = await wyda.approve(ESCROW_CONTRACT_ADDRESS, parsedAmount);
      await approveTx.wait();

      const sponsorTx = await escrow.sponsor(creator, Number(tierId));
      await sponsorTx.wait();
      setStatus("후원 완료! WYDA가 에스크로에 예치되었습니다.");
    } catch (error) {
      setStatus(`후원 실패: ${(error as Error).message}`);
    }
  }

  async function loadCreatorTiers() {
    if (!creator) {
      setStatus("크리에이터 주소를 입력하세요.");
      return;
    }

    try {
      const { escrow } = await getContracts();
      const count = Number(await escrow.tierCount(creator));
      const loaded: Tier[] = [];

      for (let i = 0; i < count; i += 1) {
        const tier = await escrow.getTier(creator, i);
        loaded.push({
          id: i,
          name: tier.name,
          monthlyAmount: ethers.formatUnits(tier.monthlyAmount, 18),
          perks: tier.perks,
          active: tier.active,
        });
      }

      setTiers(loaded);
      setStatus(`${count}개의 등급을 불러왔습니다.`);
    } catch (error) {
      setStatus(`등급 조회 실패: ${(error as Error).message}`);
    }
  }

  return (
    <div className="shell grid cols-2">
      <section className="card">
        <h1>WYDA Patreon DApp</h1>
        <p>
          BSC 네트워크에서 WYDA 토큰으로 월간 후원을 운영하는 에스크로형 플랫폼입니다.
          팬은 등급을 선택해 예치하고, 크리에이터는 조건 충족 시 인출합니다.
        </p>
        <p>
          토큰: <code>{WYDA_TOKEN_ADDRESS}</code>
        </p>
        <p>
          에스크로: <code>{ESCROW_CONTRACT_ADDRESS}</code>
        </p>
        <button onClick={connectWallet}>지갑 연결</button>
        <p>연결 상태: {shortWallet}</p>
        <p>{status}</p>
      </section>

      <section className="card">
        <h2>크리에이터 등급 생성</h2>
        <form onSubmit={handleAddTier}>
          <label>
            등급 이름
            <input value={tierName} onChange={(e) => setTierName(e.target.value)} required />
          </label>
          <label>
            월 후원 금액 (WYDA)
            <input value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>
          <label>
            제공 혜택
            <textarea value={tierPerks} onChange={(e) => setTierPerks(e.target.value)} rows={3} required />
          </label>
          <button type="submit">등급 등록</button>
        </form>
      </section>

      <section className="card">
        <h2>후원하기</h2>
        <label>
          크리에이터 주소
          <input value={creator} onChange={(e) => setCreator(e.target.value)} placeholder="0x..." required />
        </label>
        <label>
          티어 ID
          <input value={tierId} onChange={(e) => setTierId(e.target.value)} required />
        </label>
        <label>
          승인 금액 (WYDA)
          <input value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
          <button onClick={handleSponsor}>후원 승인 + 예치</button>
          <button onClick={loadCreatorTiers} type="button">
            등급 조회
          </button>
        </div>
      </section>

      <section className="card">
        <h2>크리에이터 등급 목록</h2>
        {tiers.length === 0 && <p>조회된 등급이 없습니다.</p>}
        <div className="grid">
          {tiers.map((tier) => (
            <article key={tier.id} className="card" style={{ margin: 0 }}>
              <strong>
                #{tier.id} {tier.name} {tier.active ? "✅" : "⛔"}
              </strong>
              <p>{tier.monthlyAmount} WYDA / month</p>
              <p>{tier.perks}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
