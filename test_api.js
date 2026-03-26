
const API_KEY = "7705af77ba8bb13fb97e0a4878c93dc0";
const url = "https://v3.football.api-sports.io/status";

fetch(url, {
  method: "GET",
  headers: {
    "x-apisports-key": API_KEY
  }
})
.then(res => res.json())
.then(json => console.log(JSON.stringify(json, null, 2)))
.catch(err => console.error(err));
