// =============================================
// VAVEYLA SPOR KULÜBÜ - TURNUVA VERİ YÖNETİMİ
// Firebase Realtime Database Entegrasyonu
// =============================================

// Firebase referansları (firebase ve database değişkenleri
// index.html / admin.html içindeki <script> bloklarında tanımlanmıştır)
function getDB() {
    if (typeof database === 'undefined') {
        console.error('⚠️ Firebase database henüz başlatılmadı!');
        return null;
    }
    return database;
}

// ─── TURNUVA VERİLERİ ────────────────────────────────────────────────────────

// Varsayılan takımlar (ilk kez veritabanı boşsa kullanılır)
const DEFAULT_TEAMS = {
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
};

// Firebase'den tüm turnuva verisini çek (Promise döner)
function loadData() {
    return new Promise((resolve) => {
        const db = getDB();
        if (!db) {
            resolve({ teams: DEFAULT_TEAMS, matches: [] });
            return;
        }
        db.ref('turnuva').once('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                // İlk kullanım: varsayılan veriyi yükle
                const initial = { teams: DEFAULT_TEAMS, matches: [] };
                db.ref('turnuva').set(initial);
                resolve(initial);
            } else {
                // matches Firebase'de obje olarak saklanıyor, diziye çevir
                if (data.matches && !Array.isArray(data.matches)) {
                    data.matches = Object.values(data.matches);
                } else if (!data.matches) {
                    data.matches = [];
                }
                resolve(data);
            }
        });
    });
}

// Firebase'e turnuva verisini yaz
function saveData(data) {
    const db = getDB();
    if (!db) return Promise.resolve();
    // matches dizisini temizle (undefined/null öğeleri kaldır)
    if (Array.isArray(data.matches)) {
        data.matches = data.matches.filter(m => m != null);
    }
    return db.ref('turnuva').set(data)
        .then(() => console.log('✅ Turnuva verisi Firebase\'e kaydedildi'))
        .catch(err => console.error('❌ Firebase kaydetme hatası:', err));
}

// ─── PUAN HESAPLAMA ───────────────────────────────────────────────────────────

function calculatePoints(score1, score2) {
    if (score1 == null || score2 == null) return { team1: 0, team2: 0 };
    const s1 = parseInt(score1);
    const s2 = parseInt(score2);
    const diff = Math.abs(s1 - s2);
    if (s1 > s2) {
        return diff === 2 ? { team1: 3, team2: 0 } : { team1: 2, team2: 1 };
    } else {
        return diff === 2 ? { team1: 0, team2: 3 } : { team1: 1, team2: 2 };
    }
}

function calculateStandings(group, data) {
    const teams = group === 'A' ? data.teams.groupA : data.teams.groupB;
    const standings = {};

    teams.forEach(team => {
        standings[team] = { played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, points: 0 };
    });

    data.matches
        .filter(m => m.group === group && m.played)
        .forEach(match => {
            if (!standings[match.team1] || !standings[match.team2]) return;
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
        .map(([team, stats]) => ({ team, ...stats, setAverage: stats.setsWon - stats.setsLost }))
        .sort((a, b) => b.points !== a.points ? b.points - a.points : b.setAverage - a.setAverage);
}

// ─── ANA SAYFA RENDER FONKSİYONLARI ─────────────────────────────────────────

function loadAllData() {
    const container = document.getElementById('teams-container')
        || document.getElementById('standings-container')
        || document.getElementById('fixtures-container')
        || document.getElementById('results-container');

    // Yükleniyor göster
    ['teams-container', 'standings-container', 'fixtures-container', 'results-container'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<p style="text-align:center;padding:30px;color:#888;">⏳ Yükleniyor...</p>';
    });

    loadData().then(data => {
        displayTeams(data);
        displayStandings(data);
        displayFixtures(data);
        displayResults(data);
    });
}

function displayTeams(data) {
    const container = document.getElementById('teams-container');
    if (!container) return;

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

function displayStandings(data) {
    const container = document.getElementById('standings-container');
    if (!container) return;

    let html = '<div class="groups-container">';
    ['A', 'B'].forEach(group => {
        const standings = calculateStandings(group, data);
        html += `
            <div class="group">
                <h3>${group} Grubu</h3>
                <table>
                    <thead>
                        <tr><th>#</th><th>Takım</th><th>O</th><th>G</th><th>M</th><th>S</th><th>P</th></tr>
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

function displayFixtures(data) {
    const container = document.getElementById('fixtures-container');
    if (!container) return;

    if (!data.matches || data.matches.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;padding:30px;">Henüz maç eklenmemiş.</p>';
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
                    ${match.sets ? `<div style="color:#666;font-size:0.9em;margin-top:5px;">${match.sets}</div>` : ''}
                </div>
            `;
        });
        html += '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
}

function displayResults(data) {
    const container = document.getElementById('results-container');
    if (!container) return;

    const played = data.matches.filter(m => m.played);
    if (played.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;padding:30px;">Henüz oynanmış maç bulunmamaktadır.</p>';
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
                    ${match.sets ? `<div style="color:#666;font-size:0.9em;margin-top:5px;">${match.sets}</div>` : ''}
                </div>
            `;
        });
        html += '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
}

// ─── REALTIME LİSTENER (ana sayfa canlı güncelleme) ──────────────────────────

function startRealtimeListener() {
    const db = getDB();
    if (!db) return;
    db.ref('turnuva').on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        if (data.matches && !Array.isArray(data.matches)) {
            data.matches = Object.values(data.matches);
        } else if (!data.matches) {
            data.matches = [];
        }
        console.log('🔄 Turnuva verisi güncellendi');
        displayTeams(data);
        displayStandings(data);
        displayFixtures(data);
        displayResults(data);
    });
}
