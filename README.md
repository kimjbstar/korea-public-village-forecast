##  개요
[공공데이터포털](https://data.go.kr)에서 제공하는 [기상청_동네예보 조회서비스](https://www.data.go.kr/data/15057682/openapi.do)를 더 용이하기 사용할 수 있도록 wrapping한 라이브러리입니다.

## Feature
- 🕖 조회시간 파라미터 편의성 개선
- 🗺️ grid 변환 로직 내장
- 📃 결과 그룹핑 처리 및 설명 추가

## Example
```js
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

## Options
- ServiceKey : 부여받은 서비스 키(필수)
- timeout : 기상청 통신 타임아웃 (기본값: 2000ms)
- showOrigin : 원본 데이터 표시 여부