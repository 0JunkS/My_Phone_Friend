# 🍌 내 폰 안의 친구 (MY PHONE FRIEND)
> **화면 배회 펫 & 전체 화면 상시 플로팅 & AI 음성 대화 & 3일 스마트 단기 기억 앱**

![Aesthetics: Glassmorphism](https://img.shields.io/badge/UI-Glassmorphism-f59e0b?style=for-the-badge)
![Cat Ears Design](https://img.shields.io/badge/Style-Cat_Ears_Buttons-ec4899?style=for-the-badge)
![Always-on-Top Floating Pet](https://img.shields.io/badge/Feature-Always__on__Top_Pet-38bdf8?style=for-the-badge)

---

## 🌟 주요 기능 소개

### 1. 📺 전체 화면 상시 띄우기 (Always-on-Top 데스크톱 & 화면 플로팅)
- 브라우저 창을 최소화하거나 닫아도, 다른 프로그램(게임, 문서 작업, 웹 서핑)을 띄워도 **운영체제 화면 최상단에 작은 투명 펫이 항상 살아 움직입니다.**
- Document Picture-in-Picture & Canvas PiP 기술을 통해 시스템 어디서나 함께하는 펫 친구를 경험할 수 있습니다.

### 2. 🚶‍♂️ 나노바나나 4종 감정 모션 & 자율 애정도 시스템
- 🚶‍♂️ **걸어다닐 때 (Walk)**: 화면 경계를 인식하며 아장아장 걷고 점프하는 배회 모션
- 🖐️ **들어올려졌을 때 (Lifted/Dragged)**: 마우스/터치로 잡고 이동할 때 발버둥치며 깜짝 놀라는 모션 & 관성 투척 물리
- 😢 **우울할 때 (Sad)**: 오랫동안 방치되거나 슬픈 대화를 나눌 때 시무룩하게 눈물을 찔끔 흘리며 배회
- 🎉 **기쁠 때 (Happy)**: 자주 쓰다듬어주거나 칭찬 시 방방 뛰며 하트(`💖`)와 별빛(`⭐`) 파티클 발산
- 👆 **롱 프레스 (0.5초 꾹 누르기)**: 캐릭터를 길게 누르면 플로팅 글래스모피즘 액션 메뉴 노출

### 3. 🎙️ 캐릭터 3회 터치(트리플 탭) AI 음성 대화 & ⏳ 3일 자동 만료 단기 기억
- **트리플 탭 마이크 실행**: 캐릭터를 0.6초 안에 **3번 빠르게 톡톡톡 누르면** 즉시 음성 대화 모달이 열리며 마이크 음성 인식이 시작됩니다.
- **실시간 머리 위 말풍선 동기화**: 사용자의 말과 AI의 답변이 캐릭터 머리 위 말풍선에도 실시간으로 표시됩니다.
- **1시간 미대화 심심함 감지**: 1시간 이상 말을 걸지 않으면 *"주인님 뭐하고 계실까? 🍌💭"* 등의 말풍선을 자동으로 띄웁니다.
- **3일 단기 기억 보관함 (Ephemeral Memory)**:
  - *"나중에 우산 챙겨야 해"*, *"약 사야 돼"*, *"~ 기억해줘"*를 말하면 자동 저장
  - *"아까 내가 뭐 필요하다고 했었지?"*라고 질문하면 3일 이내에 저장된 항목과 남은 시간을 정확하게 인출하여 답변
  - **정확히 72시간(3일) 후 자동으로 휴대폰/PC에서 폐기/삭제**되는 가비지 컬렉션 탑재
- **Gemini API 연동 지원**: 설정에서 API 키를 등록하면 고급 AI 모드로 대화 가능 (미입력 시에도 내장 스마트 페르소나로 완벽 작동)

### 4. 🛡️ 클라이언트 자체 이미지 검열 (Self-Censorship Safety Filter)
- 사용자 사진 업로드 시 유해 이미지(성인/음란물, 과도한 노출, 혈흔/잔혹물 등)를 캔버스 픽셀 및 색조 스키마로 자체 분석하여 부적절한 이미지 감지 시 즉각 업로드 차단 및 친절한 안내 팝업을 제공합니다.

### 5. 💎 프리미엄 글래스모피즘 & 🐱 고양이 귀 UI 디자인
- 반투명 유리 질감(`backdrop-filter: blur(20px)`), 네온 앰비언트 글로우
- 모든 주요 버튼과 다이얼로그 상단에 앙증맞은 **고양이 귀(Cat Ears)** 실루엣 디자인 적용
- 100% 인터랙티브 반응형 및 Web Audio API 절차적 효과음 내장

---

## 🚀 로컬 실행 방법

```bash
# 1. 의존성 설치
npm install

# 2. 로컬 개발 서버 실행
npm run dev

# 3. 브라우저 접속
# http://localhost:5173
```

---

## 📁 프로젝트 구조

```
MY_PHONE_FRIEND/
├── src/
│   ├── css/
│   │   ├── style.css                   # 글래스모피즘 & 고양이 귀 테마
│   │   └── character.css               # 나노바나나 4종 모션 & 파티클 (정방향 고정)
│   └── js/
│       ├── audio.js                    # Web Audio 효과음 합성기
│       ├── safetyFilter.js             # 이미지 자체 검열 필터
│       ├── memoryEngine.js             # 3일 자동 만료 기억 엔진
│       ├── aiChat.js                   # 음성 인식(STT) & AI 대화
│       ├── character.js                # 캐릭터 물리, 자율 감정 & 트리플 탭
│       ├── customizer.js               # 옷장, 액세서리, 사진 업로드
│       ├── floatingPet.js              # 전체 화면 상시 플로팅(Always-on-Top) 엔진
│       └── app.js                      # 메인 오케스트레이터
├── index.html                          # 앱 홈 & 배회 뷰 & 모달
└── package.json
```
