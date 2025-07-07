const cheerio = require('cheerio');
const {getPageContent} = require('./scraper');
//const {formatDate} = require('./utils');

/** scans in following order.
 * 1. player_id,version,name,full_name,description,image,height_cm,weight_kg,dob,positions,
 * 2. overall_rating,potential,value,wage,
 * 3. preferred_foot,weak_foot,skill_moves,international_reputation,work_rate,body_type,real_face,release_clause,
 * 4. specialities
 * 5. club_id,club_name,club_league_id,club_league_name,club_logo,club_rating,club_position,club_kit_number,club_joined,club_contract_valid_until,
 * 6. country_id,country_name,country_league_id,country_league_name,country_flag,country_rating,country_position,country_kit_number,
 * 7. crossing,finishing,heading_accuracy,short_passing,volleys,
 *   dribbling,curve,fk_accuracy,long_passing,ball_control,
 *   acceleration,sprint_speed,agility,reactions,balance,
 *   shot_power,jumping,stamina,strength,long_shots,
 *   aggression,interceptions,positioning,vision,penalties,composure,
 *   defensive_awareness,standing_tackle,sliding_tackle,
 *   gk_diving,gk_handling,gk_kicking,gk_positioning,gk_reflexes
 * 8. play_styles
 */

function formatDate(dateStr) {
    if (!dateStr) return '';

    // Parantez içinden tarihi çıkar
    const parensMatch = dateStr.match(/\((.*?)\)/);
    const rawDate = parensMatch ? parensMatch[1].trim() : dateStr.trim();

    // Türkçe kısa ve uzun aylar
    const ayMap = {
        'Oca': 'January', 'Ocak': 'January',
        'Şub': 'February', 'Şubat': 'February',
        'Mar': 'March', 'Mart': 'March',
        'Nis': 'April', 'Nisan': 'April',
        'May': 'May', 'Mayıs': 'May',
        'Haz': 'June', 'Haziran': 'June',
        'Tem': 'July', 'Temmuz': 'July',
        'Ağu': 'August', 'Ağustos': 'August',
        'Eyl': 'September', 'Eylül': 'September',
        'Eki': 'October', 'Ekim': 'October',
        'Kas': 'November', 'Kasım': 'November',
        'Ara': 'December', 'Aralık': 'December'
    };

    const trRegex = /(\d{1,2}) ([A-Za-zŞşĞğÜüÖöİıÇç]+) (\d{4})/;
    const match = rawDate.match(trRegex);

    if (match) {
        const gun = match[1];
        const ayTr = match[2];
        const yil = match[3];

        const ayEn = ayMap[ayTr];
        if (!ayEn) {
            console.log("Unknown month:", ayTr);
            return '';
        }

        const enFormatted = `${ayEn} ${gun}, ${yil}`;
        const date = new Date(enFormatted);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]; // yyyy-mm-dd
        } else {
            console.log("Invalid date:", enFormatted);
            return '';
        }
    }

    console.log("No date match:", dateStr);
    return '';
}

async function getPlayerDetailsCsvRow(url) {
    url += url.includes('?') ? '&hl=tr-TR&r=250040&set=true' : '?hl=tr-TR&r=250040&set=true';

    const html = await getPageContent(url);
    const player_id = url.split('/')[4];
    
    const $ = cheerio.load(html);
    const description = $('head meta[name=description]').attr('content');
    const version = formatDate($('body select[name=roster] option[selected]').text()) || '';
    
    const content = $('body main article');

    // 1. profile content
    // player_id,version,name,full_name,description,image,height_cm,weight_kg,dob,positions,
    const content_profile = content.find('.profile');
    const name = $('title').text().split(' FC ')[0] || '';
    const full_name = content_profile.find('h1').text();
    const image = content_profile.find('img').attr('data-src');

    // 22y.o. (Jul 21, 2000) 195cm / 6'5" 94kg / 207lbs
    const profile_string = content_profile.find('p').text();

    let dateMatch = profile_string.match(/\((.*?)\)/);
    const dob = dateMatch ? formatDate(dateMatch[1]) : '';

    const weightMatch = profile_string.match(/(\d+)kg/);
    const weight_kg = weightMatch ? weightMatch[1] : '';

    const heightMatch = profile_string.match(/(\d+)cm/);
    const height_cm = heightMatch ? heightMatch[1] : '';

    const position = content_profile.find('p span').map((i, el) => $(el).text()).get().join(',');

    // 2. overall content
    // overall_rating,potential,value,wage
    const grids = content.find('.grid').get();

    const content_overall = $(grids[0]).find('.col').map((i, el) => $(el).find('em').text()).get();

    const overall_rating = content_overall[0],
        potential = content_overall[1],
        value = content_overall[2],
        wage = content_overall[3];

    const content_player_info = $(grids[1]).find('.col');

    // 3. preferred_foot,weak_foot,skill_moves,international_reputation,work_rate,body_type,real_face,release_clause,
    function getPlayerProfile() {
        const results = ['', '', '', '', '', '', '', ''];
        const index = $(content_player_info).find('h5').map((i, el) => $(el).text().includes('Profil')).get().indexOf(true);

        if (index < 0) {
            return results;
        }

        const content_player_profile = $(content_player_info[index]).find('p').map((i, el) => $(el).text()).get();
        results[0] = content_player_profile.find(s => s.includes('Tercih Ettiği Ayak'))?.replace('Tercih Ettiği Ayak ', '') || '';
        results[1] = content_player_profile.find(s => s.includes('Zayıf Ayak'))?.replace(' Zayıf Ayak', '') || '';
        results[2] = content_player_profile.find(s => s.includes('Beceri Hareketleri'))?.replace(' Beceri Hareketleri', '') || '';
        results[3] = content_player_profile.find(s => s.includes('Uluslararasi Ün'))?.replace(' Uluslararasi Ün', '') || '';
        results[4] = content_player_profile.find(s => s.includes('Work rate'))?.replace('Work rate ', '').replace(/\s/g, '') || '';
        results[5] = content_player_profile.find(s => s.includes('Vücut Tipi'))?.replace('Vücut Tipi ', '') || '';
        results[6] = content_player_profile.find(s => s.includes('Gerçek Yüz'))?.replace('Gerçek Yüz ', '') || '';
        results[7] = content_player_profile.find(s => s.includes('Sürüm Cümlesi'))?.replace('Sürüm Cümlesi ', '') || '';
        return results;
    }


    // 4. specialities
    function getPlayerSpecialities() {
        const index = $(content_player_info).find('h5').map((i, el) => $(el).text().includes('Özel Yetenekler')).get().indexOf(true);
        if (index < 0) {
            return [''];
        }
        const content_player_specialities = $(content_player_info[index]).find('p').map((i, el) => $(el).text()).get();
        return [content_player_specialities.map(s => s?.replace('#', '').trim()).join(',')];
    }

    // 5. club_id,club_name,league_id, league_name, club_logo,club_rating,club_position,club_kit_number,club_joined,club_contract_valid_until,
    function getPlayerClub() {
        let results = ['', '', '', '', '', '', '', ''];
        const index = $(content_player_info).find('h5').map((i, el) => $(el).text().includes('Kulüp')).get().indexOf(true);
        if (index < 0) {
            return results;
        }
        const content_player_club_html = $(content_player_info[index]).find('p').map((i, el) => $(el).html()).get();

        const club_elem = content_player_club_html.find(e => e.includes('/team/'));
        const club_href = $(club_elem).attr('href');
        const club_id = club_href.split('/')[2] || '';
        const club_name = $(club_elem).text().trim() || '';
        const club_logo = $(club_elem).find('img').attr('data-src') || '';

        const club_league_elem = content_player_club_html.find(e => e.includes('/league/'));
        const club_league_href = $(club_league_elem).attr('href');
        const club_league_id = club_league_href.split('/')[2];
        const club_league_name = $(club_league_elem).text().trim() || '';

        const club_rating_elem = content_player_club_html.find(e => e.includes('<svg viewBox'));
        const club_rating = $(club_rating_elem).text().trim() || '';

        const content_player_club_elements = $(content_player_info[index]).find('p').map((i, el) => $(el).text()).get();
        const club_position = content_player_club_elements.find(s => s.includes('Pozisyon'))?.replace('Pozisyon', '').trim() || '';
        const club_kit_number = content_player_club_elements.find(s => s.includes('Forma Numarası'))?.replace('Forma Numarası', '').trim() || '';
        const club_joined = formatDate(content_player_club_elements.find(s => s.includes('Takıma Giriş'))?.replace('Takıma Giriş', '').trim()) || '';
        const club_contract_valid_util = content_player_club_elements.find(s => s.includes('Sözlesme Bitis Tarihi'))?.replace('Sözlesme Bitis Tarihi', '').trim() || '';
        results = [club_id, club_name, club_league_id, club_league_name, club_logo, club_rating, club_position, club_kit_number, club_joined, club_contract_valid_util];

        return results;
    }

    // 6. country_id,country_name,country_league_id,country_league_name,country_flag,country_rating,country_position,country_kit_number,
    function getPlayerNationalTeam() {
        let results = ['', '', '', '', '', '', '', ''];
        const index = $(content_player_info).find('h5').map((i, el) => $(el).text().includes('Milli Takım')).get().indexOf(true);
        if (index < 0) {
            return results;
        }
        const content_player_national_team = $(content_player_info[index]).find('p').map((i, el) => $(el).html()).get();

        const country_elem = content_player_national_team.find(e => e.includes('/team/'));
        const country_href = $(country_elem).attr('href');
        const country_id = country_href.split('/')[2] || '';
        const country_name = $(country_elem).text().trim() || '';
        const country_flag = $(country_elem).find('img').attr('data-src') || '';

        const country_league_elem = content_player_national_team.find(e => e.includes('/league/'));
        const country_league_href = $(country_league_elem).attr('href');
        const country_league_id = country_league_href.split('/')[2];
        const country_league_name = $(country_league_elem).text().trim() || '';

        const country_rating_elem = content_player_national_team.find(e => e.includes('<svg viewBox'));
        const country_rating = $(country_rating_elem).text().trim() || '';

        const content_player_country_elements = $(content_player_info[index]).find('p').map((i, el) => $(el).text()).get();
        const country_position = content_player_country_elements.find(s => s.includes('Pozisyon'))?.replace('Pozisyon', '').trim() || '';
        const country_kit_number = content_player_country_elements.find(s => s.includes('Forma Numarası'))?.replace('Forma Numarası', '').trim() || '';
        results = [country_id, country_name, country_league_id, country_league_name, country_flag, country_rating, country_position, country_kit_number];

        return results;
    }
    function getPlayerCountryFromHeader() {
        const countryAnchor = $('.profile a[title] img.flag').parent();
        const country_name_true = countryAnchor.attr('title') || '';
        const country_flag_true = countryAnchor.find('img').attr('data-src') || countryAnchor.find('img').attr('src') || '';
        const href = countryAnchor.attr('href') || '';
        const country_id_true = href.includes('na=') ? href.split('na=')[1] : '';
        return [country_id_true, country_name_true, country_flag_true];
    }

    function getPlayerAttributes() {
        // 7. player_attributes
        const player_attr_grid1 = $(grids[2])
            .find('.col p')
            .each((i, e) => {
                $(e).find('span.plus')?.remove();
                $(e).find('span.minus')?.remove();
            })
            .map((i, el) => $(el).text())
            .get();

        const player_attr_grid2 = $(grids[3]).find('.col p')
            .each((i, e) => {
                $(e).find('span.plus')?.remove();
                $(e).find('span.minus')?.remove();
            })
            .map((i, el) => $(el).text())
            .get();

        // attacking
        // crossing,finishing,heading_accuracy,short_passing,volleys
        const crossing = player_attr_grid1.find(s => s.includes('Orta Açma'))?.replace('Orta Açma', '').trim() || '';
        const finishing = player_attr_grid1.find(s => s.includes('Bitiricilik'))?.replace('Bitiricilik', '').trim() || '';
        const heading_accuracy = player_attr_grid1.find(s => s.includes('Kafa İsabeti'))?.replace('Kafa İsabeti', '').trim() || '';
        const short_passing = player_attr_grid1.find(s => s.includes('Kısa Pas'))?.replace('Kısa Pas', '').trim() || '';
        const volleys = player_attr_grid1.find(s => s.includes('Voleler'))?.replace('Voleler', '').trim() || '';

        // skill
        // dribbling,curve,fk_accuracy,long_passing,ball_control,
        const dribbling = player_attr_grid1.find(s => s.includes('Dribling'))?.replace('Dribling', '').trim() || '';
        const curve = player_attr_grid1.find(s => s.includes('Falso'))?.replace('Falso', '').trim() || '';
        const fk_accuracy = player_attr_grid1.find(s => s.includes('S. Vuruş İsabeti'))?.replace('S. Vuruş İsabeti', '').trim() || '';
        const long_passing = player_attr_grid1.find(s => s.includes('Uzun Paslar'))?.replace('Uzun Paslar', '').trim() || '';
        const ball_control = player_attr_grid1.find(s => s.includes('Top Kontrolü'))?.replace('Top Kontrolü', '').trim() || '';

        // movement
        // acceleration,sprint_speed,agility,reactions,balance,
        const acceleration = player_attr_grid1.find(s => s.includes('Hızlanma'))?.replace('Hızlanma', '').trim() || '';
        const sprint_speed = player_attr_grid1.find(s => s.includes('Sprint Hızı'))?.replace('Sprint Hızı', '').trim() || '';
        const agility = player_attr_grid1.find(s => s.includes('Çeviklik'))?.replace('Çeviklik', '').trim() || '';
        const reactions = player_attr_grid1.find(s => s.includes('Reaksiyonlar'))?.replace('Reaksiyonlar', '').trim() || '';
        const balance = player_attr_grid1.find(s => s.includes('Denge'))?.replace('Denge', '').trim() || '';

        // power
        // shot_power,jumping,stamina,strength,long_shots,
        const shot_power = player_attr_grid1.find(s => s.includes('Şut Gücü'))?.replace('Şut Gücü', '').trim() || '';
        const jumping = player_attr_grid1.find(s => s.includes('Zıplama'))?.replace('Zıplama', '').trim() || '';
        const stamina = player_attr_grid1.find(s => s.includes('Dayanıklılık'))?.replace('Dayanıklılık', '').trim() || '';
        const strength = player_attr_grid1.find(s => s.includes('Güç'))?.replace('Güç', '').trim() || '';
        const long_shots = player_attr_grid1.find(s => s.includes('Uzaktan Şut'))?.replace('Uzaktan Şut', '').trim() || '';

        // mentality
        // aggression,interceptions,positioning,vision,penalties,composure,
        const aggression = player_attr_grid2.find(s => s.includes('Saldırganlık'))?.replace('Saldırganlık', '').trim() || '';
        const interceptions = player_attr_grid2.find(s => s.includes('Top Kesmeler'))?.replace('Top Kesmeler', '').trim() || '';
        const positioning = player_attr_grid2.find(s => s.includes('Atak Poz.'))?.replace('Atak Poz.', '').trim() || '';
        const vision = player_attr_grid2.find(s => s.includes('Oyun Görüşü'))?.replace('Oyun Görüşü', '').trim() || '';
        const penalties = player_attr_grid2.find(s => s.includes('Penaltı'))?.replace('Penaltı', '').trim() || '';
        const composure = player_attr_grid2.find(s => s.includes('Soğukkanlılık'))?.replace('Soğukkanlılık', '').trim() || '';

        // defending
        // defensive_awareness,standing_tackle,sliding_tackle,
        const defensive_awareness = player_attr_grid2.find(s => s.includes('Savunma Bilinci'))?.replace('Savunma Bilinci', '').trim() || '';
        const standing_tackle = player_attr_grid2.find(s => s.includes('Ayakta Müdahale'))?.replace('Ayakta Müdahale', '').trim() || '';
        const sliding_tackle = player_attr_grid2.find(s => s.includes('Kayarak Müdahale'))?.replace('Kayarak Müdahale', '').trim() || '';

        // goalkeeping
        // gk_diving,gk_handling,gk_kicking,gk_positioning,gk_reflexes
        const gk_diving = player_attr_grid2.find(s => s.includes('KL Uçarak Kurtarış'))?.replace('KL Uçarak Kurtarış', '').trim() || '';
        const gk_handling = player_attr_grid2.find(s => s.includes('KL Elle Kontrol'))?.replace('KL Elle Kontrol', '').trim() || '';
        const gk_kicking = player_attr_grid2.find(s => s.includes('KL Topa Vurma'))?.replace('KL Topa Vurma', '').trim() || '';
        const gk_positioning = player_attr_grid2.find(s => s.includes('KL Yer Tutma'))?.replace('KL Yer Tutma', '').trim() || '';
        const gk_reflexes = player_attr_grid2.find(s => s.includes('KL Refleks'))?.replace('KL Refleks', '').trim() || '';

        // play_styles
        const index_play_styles = $(grids[3]).find('h5').map((i, el) => $(el).text().includes('OyunTarzları')).get().indexOf(true);
        let play_styles_array = [];
        if (index_play_styles >= 0) {
            play_styles_array = $($(grids[3]).find('.col')[index_play_styles]).find('p').map((i, el) => $(el).text()).get();
        }
        const play_styles = play_styles_array.join(',');
        return [
            crossing,
            finishing,
            heading_accuracy,
            short_passing,
            volleys,

            dribbling,
            curve,
            fk_accuracy,
            long_passing,
            ball_control,

            acceleration,
            sprint_speed,
            agility,
            reactions,
            balance,

            shot_power,
            jumping,
            stamina,
            strength,
            long_shots,

            aggression,
            interceptions,
            positioning,
            vision,
            penalties,
            composure,

            defensive_awareness,
            standing_tackle,
            sliding_tackle,

            gk_diving,
            gk_handling,
            gk_kicking,
            gk_positioning,
            gk_reflexes,
            play_styles
        ];
    }
    
const [country_id_true, country_name_true, country_flag_true] = getPlayerCountryFromHeader();
    const player_profile_attrs = getPlayerProfile();
    const player_specialities = getPlayerSpecialities();
    const player_club = getPlayerClub();
    const player_national_team = getPlayerNationalTeam();
    //const player_attributes = getPlayerAttributes();

    const line_array = [
        player_id,
        version,
        name,
        full_name,
        description,
        image,
        height_cm,
        weight_kg,
        dob,
        position,
        overall_rating,
        potential,
        value,
        wage,
        ...player_profile_attrs,
        ...player_specialities,
        ...player_club,
        ...player_national_team,
        country_id_true,
country_name_true,
country_flag_true
        //...player_attributes
    ].map((col) => {
        if (col && col.includes('"')){
            return col.replace(/"/g, '""');
        }
        return col;
    });

    return '"' + line_array.join('","') + '"';
}

module.exports = {
    getPlayerDetailsCsvRow
};
