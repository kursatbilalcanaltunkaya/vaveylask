// Turnuva Veri Yönetimi
const STORAGE_KEY = 'vaveyla_turnuva_data';

// Varsayılan veriler
const defaultData = {
    teams: {
        groupA: [
            "Anadolu Yıldızları",
            "İstanbul Fırtınası", 
            "Ankara Şampiyonları",
            "Ege Aslanları",
            "Marmara Gücü"
        ],
        groupB: [
            "Karadeniz Kartalları",
            "Akdeniz Dalgası",
            "Trakya Pars",
            "Boğaziçi United",
            "Avrupa Yakası SK"
        ]
    },
    matches: []
};

// Veriyi yükle
function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        return JSON.parse(saved);
    }
    return defaultData;
}

// Veriyi kaydet
function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Puan hesaplama
function calculatePoints(score1, score2) {
    if (!score1 || !score2) return { team1: 0, team2: 0 };
    
    const s1 = parseInt(score1);
    const s2 = parseInt(score2);
    const diff = Math.abs(s1 - s2);
    
    if (s1 > s2) {
        return diff === 2 ? { team1: 3, team2: 0 } : { team1: 2, team2: 1 };
    } else {
        return diff === 2 ? { team1: 0, team2: 3 } : { team1: 1, team2: 2 };
    }
}

// Puan durumu hesapla
function calculateStandings(group) {
    const data = loadData();
    const teams = group === 'A' ? data.teams.groupA : data.teams.groupB;
    const standings = {};
    
    teams.forEach(team => {
        standings[team] = {
            played: 0,
            won: 0,
            lost: 0,
            setsWon: 0,
            setsLost: 0,
            points: 0
        };
    });
    
    data.matches
        .filter(m => m.group === group && m.played)
        .forEach(match => {
            const pts = calculatePoints(match.score1, match.score2);
            
            standings[match.team1].played++;
            standings[match.team2].played++;
            standings[match.team1].setsWon += parseInt(match.score1);
            standings[match.team1].setsLost += parseInt(match.score2);
            standings[match.team2].setsWon += parseInt(match.score2);
            standings[match.team2].setsLost += parseInt(match.score1);
            standings[match.team1].points += pts.team1;
            standings[match.team2].points += pts.team2;
            
            if (parseInt(match.score1) > parseInt(match.score2)) {
                standings[match.team1].won++;
                standings[match.team2].lost++;
            } else {
                standings[match.team2].won++;
                standings[match.team1].lost++;
            }
        });
    
    return Object.entries(standings)
        .map(([team, stats]) => ({
            team,
            ...stats,
            setAverage: stats.setsWon - stats.setsLost
        }))
        .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.setAverage - a.setAverage;
        });
}

// Tüm verileri yükle ve göster
function loadAllData() {
    displayTeams();
    displayStandings();
    displayFixtures();
    displayResults();
}

// Takımları göster
function displayTeams() {
    const data = loadData();
    const container = document.getElementById('teams-container');
    
    let html = '<div class="groups-container">';
    
    ['A', 'B'].forEach(group => {
        const teams = group === 'A' ? data.teams.groupA : data.teams.groupB;
        html += `<div class="group"><h3>${group} Grubu</h3>`;
        
        teams.forEach(team => {
            html += `<div class="team-card"><h4>${team}</h4><p>Karma Takım</p></div>`;
        });
        
        html += '</div>';
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Puan durumunu göster
function displayStandings() {
    const container = document.getElementById('standings-container');
    let html = '<div class="groups-container">';
    
    ['A', 'B'].forEach(group => {
        const standings = calculateStandings(group);
        
        html += `
            <div class="group">
                <h3>${group} Grubu</h3>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Takım</th>
                            <th>O</th>
                            <th>G</th>
                            <th>M</th>
                            <th>S</th>
                            <th>P</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        standings.forEach((team, i) => {
            const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : '';
            html += `
                <tr class="${rankClass}">
                    <td>${i + 1}</td>
                    <td><strong>${team.team}</strong></td>
                    <td>${team.played}</td>
                    <td>${team.won}</td>
                    <td>${team.lost}</td>
                    <td>${team.setAverage > 0 ? '+' : ''}${team.setAverage}</td>
                    <td><strong>${team.points}</strong></td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
                <small style="color:#666">O: Oynanan, G: Galibiyet, M: Mağlubiyet, S: Set Averajı, P: Puan</small>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Fikstürü göster
function displayFixtures() {
    const data = loadData();
    const container = document.getElementById('fixtures-container');
    
    if (data.matches.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;">Henüz maç eklenmemiş.</p>';
        return;
    }
    
    let html = '<div class="groups-container">';
    
    ['A', 'B'].forEach(group => {
        const matches = data.matches.filter(m => m.group === group);
        if (matches.length === 0) return;
        
        html += `<div class="group"><h3>${group} Grubu</h3>`;
        
        matches.forEach(match => {
            html += `
                <div class="match">
                    <div class="match-date">${match.date}</div>
                    <div class="match-teams">
                        <span class="team">${match.team1}</span>
                        <span class="score">${match.played ? match.score1 + ' - ' + match.score2 : 'vs'}</span>
                        <span class="team">${match.team2}</span>
                    </div>
                    ${match.sets ? '<div style="color:#666;font-size:0.9em;margin-top:5px;">' + match.sets + '</div>' : ''}
                </div>
            `;
        });
        
        html += '</div>';
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Sonuçları göster
function displayResults() {
    const data = loadData();
    const container = document.getElementById('results-container');
    const played = data.matches.filter(m => m.played);
    
    if (played.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;">Henüz oynanmış maç bulunmamaktadır.</p>';
        return;
    }
    
    let html = '<div class="groups-container">';
    
    ['A', 'B'].forEach(group => {
        const matches = played.filter(m => m.group === group);
        if (matches.length === 0) return;
        
        html += `<div class="group"><h3>${group} Grubu Sonuçları</h3>`;
        
        matches.forEach(match => {
            html += `
                <div class="match">
                    <div class="match-date">${match.date}</div>
                    <div class="match-teams">
                        <span class="team">${match.team1}</span>
                        <span class="score">${match.score1} - ${match.score2}</span>
                        <span class="team">${match.team2}</span>
                    </div>
                    ${match.sets ? '<div style="color:#666;font-size:0.9em;margin-top:5px;">' + match.sets + '</div>' : ''}
                </div>
            `;
        });
        
        html += '</div>';
    });
    
    html += '</div>';
    container.innerHTML = html;
}
