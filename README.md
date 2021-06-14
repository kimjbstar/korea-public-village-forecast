##  개요
[공공데이터포털](https://data.go.kr)에서 제공하는 [기상청_동네예보 조회서비스](https://www.data.go.kr/data/15057682/openapi.do)를 더 용이하기 사용할 수 있도록 wrapping한 라이브러리입니다.

---
## Feature
🕖 조회시간 파라미터 편의성 개선
- 현재 시간 defualt 값 적용, 발표 시간을 고려한 이전 데이터 조회

🗺️ grid 변환 로직 내장
- 위경도 -> 격자 테이블 데이터를 관리할 필요 없이 계산하여 자동으로 추론

📃 결과 가공 및 설명 추가
- 분석 및 애플리케이션에 적용을 용이하기 하기 위해 날짜별 그룹핑, 코드별 맵핑 및 description 추가
- 가공 전 origin 데이터 조회 on/off 기능 

---
## Example
```js
import { VillageForecast } from "korea-public-village-forecast"

const villageForecast = new VillageForecast({
  serviceKey: VILLAGE_FORECAST_KEY,
});

// 초단기실황조회
const result = await villageForecast.getUltraSrtNcst({
  lat: 37.4871167,
  lng: 126.7274377,
  datetime: '2021-05-02 09:00'
});
```
```js
{
  url: 'http://apis.data.go.kr/1360000/VilageFcstInfoService/getUltraSrtNcst?serviceKey=VILLAGE_FORECAST_KEY&pageNo=1&numOfRows=1024&base_date=20210613&base_time=0900&nx=56&ny=125&dataType=JSON',
  baseDate: '2021-05-02 09:00',
  items: [
    { category: 'PTY',
      value: '0',
      desc: '강수형태',
      valueDesc: '없음'
    },
    { category: 'REH', value: '77', desc: '습도(%)' },
    { category: 'RN1', value: '0', desc: '1시간 강수량(mm)' },
    { category: 'T1H', value: '23.8', desc: '기온(c)' },
    { category: 'UUU', value: '0.6', desc: '풍속(동서성분)' },
    {
      category: 'VEC',
      value: '196',
      desc: '풍향(deg)',
      valueDesc: 'S-SW'
    },
    { category: 'VVV', value: '2', desc: '풍속(남북성분)' },
    { category: 'WSD', value: '2.1', desc: '풍속(m/s)' }
  ],
  origin: null
}
```
---
## Options
serviceKey : 부여받은 서비스 키(필수)

timeout : 기상청 통신 타임아웃 (기본값: 2000ms)
- 간헐적으로 기상청 측 response가 매우 느린 경우가 있어 이 부분을 핸들링 할 수 있습니다.

showOrigin : 원본 데이터 표시 여부
- 가공된 데이터 대신 이전 원본 데이터를 제공합니다.