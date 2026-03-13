const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/PUBG_API_KEY=(.*)/);
const key = keyMatch[1].trim();

fetch('https://api.pubg.com/shards/steam/players/account.2b7f7e974e6445f6be8af56f35a02e6c/weapon_mastery', {
  headers: {
    'Authorization': 'Bearer ' + key,
    'Accept': 'application/vnd.api+json'
  }
}).then(r => r.json()).then(d => {
  if (d.data && d.data.attributes) {
    console.log("Got attributes. Keys:", Object.keys(d.data.attributes));
    const summaries = d.data.attributes.weaponSummaries;
    console.log("Type of summaries:", typeof summaries);
    if (summaries) {
      const keys = Object.keys(summaries);
      console.log("Number of weapons in summary:", keys.length);
      if (keys.length > 0) {
        console.log("Example weapon:", keys[0], summaries[keys[0]]);
      }
    }
  } else {
    console.log("No attributes found:", d);
  }
}).catch(console.error);
