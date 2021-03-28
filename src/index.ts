import { VillageForecast } from "./villageForecast";

async function main() {
    const villageForecast = new VillageForecast();
    villageForecast.setServiceKey("/eU/Y//rNBokLkGmOD9GyVv8SuuO9UjhA2rQUVXBmob5C9M3Jr7cKj5rHFVdrnL9yZ5dhuAOGHp5gVHUTkD7dA==")
    const result = await villageForecast.getUltraSrtNcst(37.4871167, 126.7274377);
    // const result = await villageForecast.getUltraSrtFcst(37.4871167, 126.7274377);
    // const result = await villageForecast.getVilageFcst(37.4871167, 126.7274377);
    // const result = await villageForecast.getFcstVersion('ODAM');
    console.dir(result, { depth: null })
}
main();
