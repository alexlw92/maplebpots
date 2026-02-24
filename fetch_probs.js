const fs = require('fs');

const url = 'https://maplestory.nexon.com/Guide/OtherProbability/cube/GetSearchProbList';
const cubeItemId = 5062500;
const grades = [3, 4];
const partsTypes = Array.from({ length: 20 }, (_, i) => i + 1);
const levels = [140, 150, 160, 200, 250];

async function fetchAll() {
  const results = [];
  let total = grades.length * partsTypes.length * levels.length;
  let count = 0;

  for (const nGrade of grades) {
    for (const nPartsType of partsTypes) {
      for (const nRequiredLevel of levels) {
        count++;
        console.log(`Fetching ${count}/${total}: grade=${nGrade}, parts=${nPartsType}, level=${nRequiredLevel}`);
        
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `nCubeItemId=${cubeItemId}&nGrade=${nGrade}&nPartsType=${nPartsType}&nRequiredLevel=${nRequiredLevel}`
          });
          
          const data = await res.json();
          results.push({
            nCubeItemId: cubeItemId,
            nGrade,
            nPartsType,
            nRequiredLevel,
            response: data
          });
        } catch (err) {
          console.error(`Error: ${err.message}`);
          results.push({
            nCubeItemId: cubeItemId,
            nGrade,
            nPartsType,
            nRequiredLevel,
            error: err.message
          });
        }
        
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
      }
    }
  }

  fs.writeFileSync('cube_probabilities.json', JSON.stringify(results, null, 2));
  console.log(`Done! Saved ${results.length} results to cube_probabilities.json`);
}

fetchAll();
