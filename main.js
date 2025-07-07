const fs = require('fs');
const {getPlayerDetailsCsvRow} = require('./services/parser');
const {loadPlayerUrlsFile} = require('./services/player-urls-loader');
const assert = require('assert');

const playerUrlsFullFile = './files/player-urls-full.csv';
const playerUrlsTestFile = './files/player-urls-test.csv';

const playerDataFullFile = './output/player-data-full.csv';
const playerDataTestFile = './output/player-data-test.csv';

const scanType = process.argv[2];

const row_header = `"player_id","version","name","full_name","description","image","height_cm","weight_kg","dob","positions","overall_rating","potential","value","wage","preferred_foot","weak_foot","skill_moves","international_reputation","work_rate","body_type","real_face","release_clause","specialities","club_id","club_name","club_league_id","club_league_name","club_logo","club_rating","club_position","club_kit_number","club_joined","club_contract_valid_until","country_id","country_name","country_league_id","country_league_name","country_flag","country_rating","country_position","country_kit_number","country_id_true","country_name_true","country_flag_true","crossing","finishing","heading_accuracy","short_passing","volleys","dribbling","curve","fk_accuracy","long_passing","ball_control","acceleration","sprint_speed","agility","reactions","balance","shot_power","jumping","stamina","strength","long_shots","aggression","interceptions","positioning","vision","penalties","composure","defensive_awareness","standing_tackle","sliding_tackle","gk_diving","gk_handling","gk_kicking","gk_positioning","gk_reflexes","play_styles"\n`;

const checkpointFile = './output/checkpoint.txt';
async function download(fileToRead, fileToWrite) {
    const playerUrlList = fs.readFileSync(fileToRead).toString().trim().split('\n');
    if (!fs.existsSync(fileToWrite)) {
        fs.writeFileSync(fileToWrite, row_header, { flag: 'w' });
    }    
    let lastIndex = -1;
    if (fs.existsSync(checkpointFile)) {
        const checkpointContent = fs.readFileSync(checkpointFile, 'utf-8');
        lastIndex = parseInt(checkpointContent, 10);
        if (isNaN(lastIndex)) lastIndex = -1;
    }

    let count = 0;
    console.time('scan complete');
    for (let i = lastIndex + 1; i < playerUrlList.length; i++) {
        let url = playerUrlList[i];
        try {
            let row = await getPlayerDetailsCsvRow(url);
            fs.writeFileSync(fileToWrite, row + '\n', {flag: 'a'});
            fs.writeFileSync(checkpointFile, i.toString(), {flag: 'w'});
            console.log((i + 1) + '-' + url);
        } catch (err) {
            console.error(`Erreur sur ${url}:`, err);
            break;
        }
    }
    console.timeEnd('scan complete');
    if (fs.existsSync(checkpointFile)) fs.unlinkSync(checkpointFile);
}

(async function start() {
    if (scanType === 'full') {
        console.log('running full scan.');
        await download(playerUrlsFullFile, playerDataFullFile);
    } else if (scanType === 'test') {
        console.log('running test scan.');
        await download(playerUrlsTestFile, playerDataTestFile);
        const content = fs.readFileSync(playerDataTestFile).toString();
        assert(content.includes('2000-07-21'), 'Haaland Birthday not present.');
        assert(content.includes('1998-12-20'), 'Mbappe Birthday not present.');
        console.log('all tests pass ✅');
    } else if (scanType === 'download-urls') {
        console.log('starting to download latest player urls...');
        await loadPlayerUrlsFile('full');
    } else if (scanType === 'download-urls-test') {
        console.log('starting to download latest player urls...');
        await loadPlayerUrlsFile('test');
    }
}());
