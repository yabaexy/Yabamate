# WYDA Patreon-style Sponsorship DApp (Next.js + Solidity)

BSC 메인넷의 WYDA 토큰(`0xD84B7E8b295d9Fa9656527AC33Bf4F683aE7d2C4`) 기반으로,
Patreon 형태의 월간 후원을 위한 DApp 레퍼런스 구현입니다.

## 구성

- `contracts/WydaPatreonEscrow.sol`
  - 크리에이터 티어 생성/수정
  - 스폰서의 티어 선택 후 WYDA 예치
  - 스폰서 구독 취소
  - 크리에이터 인출 이벤트/골격
- `app`, `components`, `lib`
  - Next.js App Router 기반 UI
  - Ethers v6로 Metamask 및 컨트랙트 연동
  - BSC 체인 전환, 티어 조회, approve+sponsor 실행

## 빠른 시작

```bash
npm install
npm run dev
```

`.env.local` 예시:

```bash
NEXT_PUBLIC_ESCROW_ADDRESS=0xYourEscrowContract
NEXT_PUBLIC_BSC_RPC=https://bsc-dataseed.binance.org
```

## 배포 흐름 권장

1. `WydaPatreonEscrow.sol` 배포(생성자에 WYDA 토큰 주소 전달).
2. 배포된 주소를 `NEXT_PUBLIC_ESCROW_ADDRESS`로 설정.
3. UI에서 크리에이터 티어 생성 → 팬이 approve + sponsor.
4. 인출 로직은 운영 요구사항에 맞게 `_settleCreator`를 확장.

## 주의

- 본 솔리디티 코드는 참고용 기본 골격입니다. 실제 운영 전 보안 감사와
  정확한 정산 인덱싱 구조(서브그래프/백엔드)를 추가해야 합니다.
