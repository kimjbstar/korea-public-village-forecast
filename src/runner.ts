import { VillageForecast } from ".";
import * as dotenv from "dotenv";

async function main() {
  const villageForecast = new VillageForecast();
  const dotenvResult = dotenv.config();

  villageForecast.setServiceKey(dotenvResult.parsed.VILLAGE_FORECAST_KEY);

  // 초단기실황조회
  const result = await villageForecast.getUltraSrtNcst(37.4871167, 126.7274377);

  // 초단기예보조회
  // const result = await villageForecast.getUltraSrtFcst(37.4871167, 126.7274377);

  // 동네예보조회
  // const result = await villageForecast.getVilageFcst(37.4871167, 126.7274377);

  // 예보버전조회
  // const result = await villageForecast.getFcstVersion('ODAM');

  console.dir(result, { depth: null });
}
main();
