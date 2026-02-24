const fs = require('fs');

const url = 'https://maplestory.nexon.com/Guide/OtherProbability/cube/GetSearchProbList';
const cubeItemID = 5062500;
const grades = [3, 4];
const partsTypes = Array.from({ length: 20 }, (_, i) => i + 1);
const levels = [140, 150, 160, 200, 250];

const itemTypeMap = {
  1: 'Weapon',
  2: 'Emblem',
  3: 'Secondary Weapon',
  4: null, // Force Shield/Soul Ring - same as Secondary Weapon
  5: null, // Shield - same as Secondary Weapon
  6: 'Hat',
  7: 'Armor', // Top - represents Top/Overall/Bottom/Shoes/Cape/Belt/Shoulder
  8: null, // Overall - same as Armor
  9: null, // Bottom - same as Armor
  10: null, // Shoes - same as Armor
  11: 'Gloves',
  12: null, // Cape - same as Armor
  13: null, // Belt - same as Armor
  14: null, // Shoulder - same as Armor
  15: 'Accessory', // Face Accessory - represents Face/Eye/Earring/Ring/Pendant
  16: null, // Eye Accessory - same as Accessory
  17: null, // Earring - same as Accessory
  18: null, // Ring - same as Accessory
  19: null, // Pendant - same as Accessory
  20: 'Heart'
};

const tierMap = {
  3: 'Unique',
  4: 'Legendary'
};

function translatePotential(korean) {
  const recoveryMatch = korean.match(/공격 시 (\d+)% 확률로 (\d+)의 (HP|MP) 회복/);
  if (recoveryMatch) {
    return `${recoveryMatch[1]}% chance to recover ${recoveryMatch[2]} ${recoveryMatch[3]} when attacking.`;
  }

  const perLevelMatch = korean.match(/캐릭터 기준 9레벨 당 (STR|DEX|INT|LUK) \+(\d+)/);
  if (perLevelMatch) {
    return `${perLevelMatch[1]} +${perLevelMatch[2]} per 9 character levels`;
  }

  const cooldownMatch = korean.match(/스킬 재사용 대기시간 -(\d+)초/);
  if (cooldownMatch) {
    return `Skill Cooldown: -${cooldownMatch[1]} sec`;
  }

  const translations = {
    '최대 HP': 'Max HP',
    '최대 MP': 'Max MP',
    '공격력': 'ATT',
    '마력': 'Magic ATT',
    '크리티컬 확률': 'Critical Rate',
    '크리티컬 데미지': 'Critical Damage',
    '데미지': 'Damage',
    '보스 몬스터 공격 시 데미지': 'Boss Damage',
    '몬스터 방어율 무시': 'Ignore DEF',
    '올스탯': 'All Stats',
    '방어력': 'DEF',
    '이동속도': 'Move Speed',
    '점프력': 'Jump',
    '총 데미지': 'Total Damage',
    '메소 획득량': 'Meso Obtained',
    '아이템 드롭률': 'Item Drop Rate',
    'HP 회복 아이템 및 회복 스킬 효율': 'HP Recovery Item and Skill Efficiency',
    '모든 스킬의 MP 소모': 'All Skills MP Cost'
  };

  let result = korean;
  for (const [kr, en] of Object.entries(translations)) {
    result = result.replace(kr, en);
  }
  return result;
}

function parseTable(html, tableClass) {
  const tableRegex = new RegExp(`<table class="cube_data ${tableClass}"[\\s\\S]*?<tbody>([\\s\\S]*?)<\\/tbody>`, 'i');
  const tableMatch = html.match(tableRegex);
  if (!tableMatch) return [];

  const tbody = tableMatch[1];
  const rows = [];
  const rowRegex = /<tr>\s*<td>([^<]+)<\/td>\s*(?:<td>[^<]*<\/td>\s*)?<td>(\d+\.?\d*)%<\/td>\s*<\/tr>/g;

  let match;
  while ((match = rowRegex.exec(tbody)) !== null) {
    rows.push({
      potential: translatePotential(match[1].trim()),
      probability: parseFloat(match[2]) / 100
    });
  }
  return rows;
}

async function fetchAll() {
  const allResults = [];
  const total = grades.length * partsTypes.length * levels.length;
  let count = 0;
  let successCount = 0;

  console.log(`Fetching ${total} combinations...`);

  for (const nGrade of grades) {
    for (const nPartsType of partsTypes) {
      // Skip duplicate item types
      if (itemTypeMap[nPartsType] === null) continue;

      for (const nReqLev of levels) {
        count++;
        process.stdout.write(`\r[${count}/${total}] ${tierMap[nGrade]}, ${itemTypeMap[nPartsType]}, Level ${nReqLev}    `);

        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
              'Accept': '*/*',
              'X-Requested-With': 'XMLHttpRequest',
            },
            body: `nCubeItemID=${cubeItemID}&nGrade=${nGrade}&nPartsType=${nPartsType}&nReqLev=${nReqLev}`
          });

          const html = await res.text();
          const line1 = parseTable(html, '_1');

          if (line1.length > 0) {
            successCount++;
            allResults.push({
              tier: tierMap[nGrade],
              itemType: itemTypeMap[nPartsType],
              level: nReqLev,
              potentials: line1
            });
          }
        } catch (err) {
          // Skip errors
        }

        await new Promise(r => setTimeout(r, 100));
      }
    }
  }

  console.log(`\n\nDone! Successfully fetched ${successCount}/${total} combinations`);

  fs.writeFileSync('cube_probabilities.json', JSON.stringify(allResults, null, 2));
  console.log('Saved to cube_probabilities.json');
}

fetchAll();
