import { VillageForecast } from "."

async function run() {
  const villageForecast = new VillageForecast({
    serviceKey: "/eU/Y//rNBokLkGmOD9GyVv8SuuO9UjhA2rQUVXBmob5C9M3Jr7cKj5rHFVdrnL9yZ5dhuAOGHp5gVHUTkD7dA==",
    timeout: 3000,
  });

  // 초단기실황조회
  const result = await villageForecast.getUltraSrtNcst({
    lat: 37.4871167,
    lng: 126.7274377,
    datetime: '2021-06-13 09:00'
  });
  console.dir(result, { depth: null });

  // 초단기예보조회
  // const result = await villageForecast.getUltraSrtFcst({
  //   lat: 37.4871167, lng: 126.7274377
  // });
  // console.dir(result, { depth: null });

  // 동네예보조회
  // const result = await villageForecast.getVilageFcst({
  //   lat: 37.4871167, lng: 126.7274377,
  //   datetime: '2021-06-13 08:00'
  // });
  // console.dir(result, { depth: null });

  // 예보버전조회
  // const result = await villageForecast.getFcstVersion({
  //   type: 'ODAM',
  //   datetime: '2021-06-13 08:00'
  // });
  // console.dir(result, { depth: null });

}
run();
