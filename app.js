const timetableData = {
    // 🚌 【行き】パークタウン入口 ➔ 東松山駅〔東口〕
    "outbound": {
        "departure": "パークタウン入口",
        "destination": "東松山駅〔東口〕行",
        "timetable": {
            "weekday": {
                "5": [42],
                "6": [10, 26, 36, 57],
                "7": [9, 22, 41, 54],
                "8": [12, 25],
                "9": [0, 22, 35],
                "10": [0, 16, 44],
                "11": [6, 26, 46],
                "12": [18, 36, 56],
                "13": [16, 36, 56],
                "14": [16],
                "15": [1, 36],
                "16": [9, 25, 46],
                "17": [1, 14, 39],
                "18": [4, 19, 42],
                "19": [36],
                "20": [7, 39],
                "21": [8],
                "22": [8]
            },
            "holiday": {
                "5": [56],
                "6": [26, 51],
                "7": [21, 51],
                "8": [21, 51],
                "9": [16, 46],
                "10": [16, 36, 56],
                "11": [16, 36, 56],
                "12": [36],
                "13": [16, 56],
                "14": [36, 56],
                "15": [16, 46],
                "16": [26, 56],
                "17": [17, 41],
                "18": [2, 26],
                "19": [6, 46],
                "20": [14, 46],
                "21": [16, 46]
            }
        }
    },
    // 🚌 【帰り】東松山駅〔東口〕 ➔ パークタウン五領
    "inbound": {
        "departure": "東松山駅〔東口〕",
        "destination": "パークタウン五領 行",
        "timetable": {
            "weekday": {
                "6": [38, 51],
                "7": [24, 36, 55],
                "8": [8, 28, 40],
                "9": [19, 40],
                "10": [18, 40],
                "11": [4, 25, 43],
                "12": [0, 35, 55],
                "13": [15, 35, 55],
                "14": [15, 35],
                "15": [17, 55],
                "16": [25, 42],
                "17": [2, 17, 35, 58],
                "18": [22, 40],
                "19": [0, 27, 51],
                "20": [23, 52],
                "21": [23, 52],
                "22": [23]
            },
            "holiday": {
                "7": [4, 34],
                "8": [4, 34],
                "9": [5, 29, 59],
                "10": [35, 55],
                "11": [15, 35, 55],
                "12": [15, 55],
                "13": [35],
                "14": [15, 55],
                "15": [15, 35],
                "16": [5, 45],
                "17": [15, 35],
                "18": [0, 20, 45],
                "19": [20, 45],
                "20": [0, 30],
                "21": [0, 30],
                "22": [0]
            }
        }
    }
};

// 国立天文台の公表値。振替休日・国民の休日も含む。
// 将来の祝日は翌年の暦要項が公表されたら追加する。
const japaneseHolidays = {
    2026: new Set([
        '01-01', '01-12', '02-11', '02-23', '03-20', '04-29',
        '05-03', '05-04', '05-05', '05-06', '07-20', '08-11',
        '09-21', '09-22', '09-23', '10-12', '11-03', '11-23'
    ]),
    2027: new Set([
        '01-01', '01-11', '02-11', '02-23', '03-21', '03-22',
        '04-29', '05-03', '05-04', '05-05', '07-19', '08-11',
        '09-20', '09-23', '10-11', '11-03', '11-23'
    ])
};

function usesHolidayTimetable(date) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return true;

    const month = date.getMonth() + 1;
    const day = date.getDate();
    // 川越観光自動車の指定するお盆・年末年始の特別運行期間。
    if ((month === 8 && day >= 13 && day <= 16) ||
        (month === 12 && day >= 30) ||
        (month === 1 && day <= 3)) return true;

    const mmdd = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return japaneseHolidays[date.getFullYear()]?.has(mmdd) ?? false;
}

let currentDirection = "outbound";
let timerId = null;

window.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    if (now.getHours() < 12) {
        currentDirection = "outbound";
    } else {
        currentDirection = "inbound";
    }

    document.getElementById('tab-outbound').addEventListener('click', () => switchDirection('outbound'));
    document.getElementById('tab-inbound').addEventListener('click', () => switchDirection('inbound'));
    document.getElementById('refresh-btn').addEventListener('click', updateCountdown);

    const timetableModal = document.getElementById('timetable-modal');
    document.getElementById('timetable-open').addEventListener('click', () => {
        renderTimetable();
        timetableModal.hidden = false;
        document.getElementById('timetable-close').focus();
    });
    document.getElementById('timetable-close').addEventListener('click', closeTimetable);
    document.getElementById('timetable-outbound').addEventListener('click', () => switchDirection('outbound'));
    document.getElementById('timetable-inbound').addEventListener('click', () => switchDirection('inbound'));
    timetableModal.addEventListener('click', (event) => {
        if (event.target === timetableModal) closeTimetable();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !timetableModal.hidden) closeTimetable();
    });

    updateCountdown();
    timerId = setInterval(updateCountdown, 1000);
});

function switchDirection(direction) {
    currentDirection = direction;
    updateCountdown();
    if (!document.getElementById('timetable-modal').hidden) renderTimetable();
}

function closeTimetable() {
    document.getElementById('timetable-modal').hidden = true;
    document.getElementById('timetable-open').focus();
}

function renderTimetable() {
    const activeData = timetableData[currentDirection];
    document.getElementById('timetable-route').textContent =
        `${activeData.departure} → ${activeData.destination.replace(/\s*行$/, '')}`;

    for (const direction of ['outbound', 'inbound']) {
        const button = document.getElementById(`timetable-${direction}`);
        const isActive = direction === currentDirection;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    }

    const isHoliday = usesHolidayTimetable(new Date());
    document.getElementById('weekday-header').classList.toggle('today', !isHoliday);
    document.getElementById('holiday-header').classList.toggle('today', isHoliday);

    const tbody = document.getElementById('timetable-body');
    tbody.replaceChildren();
    for (let hour = 5; hour <= 22; hour++) {
        const weekdayTimes = activeData.timetable.weekday[String(hour)] ?? [];
        const holidayTimes = activeData.timetable.holiday[String(hour)] ?? [];
        if (weekdayTimes.length === 0 && holidayTimes.length === 0) continue;

        const tr = document.createElement('tr');
        const hourCell = document.createElement('th');
        hourCell.scope = 'row';
        hourCell.textContent = `${hour}時`;
        tr.appendChild(hourCell);

        for (const [times, currentDay] of [[weekdayTimes, !isHoliday], [holidayTimes, isHoliday]]) {
            const cell = document.createElement('td');
            cell.textContent = times.length ? times.map(m => String(m).padStart(2, '0')).join('・') : '—';
            cell.classList.toggle('today', currentDay);
            tr.appendChild(cell);
        }
        tbody.appendChild(tr);
    }
}

function updateCountdown() {
    document.getElementById('tab-outbound').classList.toggle('active', currentDirection === 'outbound');
    document.getElementById('tab-inbound').classList.toggle('active', currentDirection === 'inbound');

    const activeData = timetableData[currentDirection];
    document.getElementById('departure-station').innerText = activeData.departure;
    document.getElementById('destination-station').innerText = `↓ ${activeData.destination}`;

    const now = new Date();
    const type = usesHolidayTimetable(now) ? 'holiday' : 'weekday';

    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    let foundBuses = [];
    let searchHour = currentHour;
    
    while (searchHour <= 23 && foundBuses.length < 2) {
        const mins = activeData.timetable[type][searchHour.toString()];
        if (mins) {
            for (let m of mins) {
                if (searchHour > currentHour || m >= currentMin) {
                    foundBuses.push({ hour: searchHour, min: m });
                    if (foundBuses.length >= 2) break;
                }
            }
        }
        searchHour++;
    }

    const minText = document.getElementById('minutes');
    const detailsText = document.getElementById('schedule-details');

    if (foundBuses.length === 0) {
        minText.innerText = "運行終了";
        minText.style.color = 'var(--text-ended)';
        detailsText.innerText = "本日のバスは終了しました";
        return;
    }

    const nextBus = foundBuses[0];
    const nextBusTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), nextBus.hour, nextBus.min, 0);
    const diffMs = nextBusTime.getTime() - now.getTime();
    
    if (diffMs <= 0) {
        minText.innerText = "まもなく発車";
        return;
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const displayMins = Math.floor(totalSeconds / 60);
    const displaySecs = totalSeconds % 60;

    minText.innerText = `あと ${displayMins} 分 ${displaySecs} 秒`;
    
    let detailsString = `次発 ${nextBus.hour}:${nextBus.min.toString().padStart(2, '0')}`;
    if (foundBuses[1]) {
        detailsString += `  /  次々発 ${foundBuses[1].hour}:${foundBuses[1].min.toString().padStart(2, '0')}`;
    }
    detailsText.innerText = detailsString;

    let textColor = 'var(--text-normal)';
    if (totalSeconds <= 180) {
        textColor = 'var(--text-urgent)';
    } else if (totalSeconds <= 600) {
        textColor = 'var(--text-soon)';
    }
    minText.style.color = textColor;
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
    .then(() => console.log('Service Worker 登録成功'))
    .catch(err => console.error('Service Worker 登録失敗', err));
}
