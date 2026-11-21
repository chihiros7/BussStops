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

// 初回は「駅へ行く」。以降はユーザーが最後に選んだ方向を使う。
const DIRECTION_KEY = 'bussstops-direction';
const TRAIN_DIRECTION_KEY = 'bussstops-train-direction';
const BUS_TO_STATION_MINUTES = 14;
const STATION_TRANSFER_MINUTES = 5;
const MAX_CONNECTION_WAIT_MINUTES = 120;
const EXCLUDED_TRAIN_KINDS = new Set(['TJライナー', '普通']);
let currentDirection = 'outbound';
let trainDirection = 'up';
let selectedDaytype = 'weekday';

window.addEventListener('DOMContentLoaded', () => {
    try {
        const saved = localStorage.getItem(DIRECTION_KEY);
        if (saved === 'outbound' || saved === 'inbound') currentDirection = saved;
        const savedTrainDirection = localStorage.getItem(TRAIN_DIRECTION_KEY);
        if (savedTrainDirection === 'up' || savedTrainDirection === 'down') trainDirection = savedTrainDirection;
    } catch (_) {
        // ストレージが無効でも時刻表は利用できる。
    }

    selectedDaytype = usesHolidayTimetable(new Date()) ? 'holiday' : 'weekday';
    document.getElementById('tab-outbound').addEventListener('click', () => switchDirection('outbound'));
    document.getElementById('tab-inbound').addEventListener('click', () => switchDirection('inbound'));
    document.getElementById('refresh-btn').addEventListener('click', updateCountdown);
    document.getElementById('train-up').addEventListener('click', () => switchTrainDirection('up'));
    document.getElementById('train-down').addEventListener('click', () => switchTrainDirection('down'));
    document.getElementById('train-toggle').addEventListener('click', () => {
        const details = document.getElementById('train-details');
        details.hidden = !details.hidden;
        document.getElementById('train-toggle').setAttribute('aria-expanded', String(!details.hidden));
    });

    document.getElementById('timetable-open').addEventListener('click', () => {
        selectedDaytype = usesHolidayTimetable(new Date()) ? 'holiday' : 'weekday';
        renderTimetable();
        document.getElementById('home-view').hidden = true;
        document.getElementById('timetable-view').hidden = false;
        window.scrollTo(0, 0);
        document.getElementById('timetable-close').focus();
    });
    document.getElementById('timetable-close').addEventListener('click', closeTimetable);
    document.getElementById('timetable-outbound').addEventListener('click', () => switchDirection('outbound'));
    document.getElementById('timetable-inbound').addEventListener('click', () => switchDirection('inbound'));
    document.getElementById('timetable-weekday').addEventListener('click', () => selectDaytype('weekday'));
    document.getElementById('timetable-holiday').addEventListener('click', () => selectDaytype('holiday'));
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !document.getElementById('timetable-view').hidden) closeTimetable();
    });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) updateCountdown();
    });
    updateCountdown();
    setInterval(updateCountdown, 1000);
});

function switchDirection(direction) {
    currentDirection = direction;
    // 行き／帰りの切り替え後は常に省スペース表示に戻す。
    document.getElementById('train-details').hidden = true;
    document.getElementById('train-toggle').setAttribute('aria-expanded', 'false');
    try { localStorage.setItem(DIRECTION_KEY, direction); } catch (_) { /* 保存不可でも動作する */ }
    updateCountdown();
    if (!document.getElementById('timetable-view').hidden) renderTimetable();
}

function switchTrainDirection(direction) {
    trainDirection = direction;
    try { localStorage.setItem(TRAIN_DIRECTION_KEY, direction); } catch (_) { /* 保存不可でも動作する */ }
    updateCountdown();
}

// バス特有のお盆・年末年始ダイヤを鉄道に転用しない。
function usesRailHolidayTimetable(date) {
    if (date.getDay() === 0 || date.getDay() === 6) return true;
    const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return japaneseHolidays[date.getFullYear()]?.has(mmdd) ?? false;
}

function getRailServiceDepartures(serviceDay, direction) {
    const info = trainTimetableData.directions[direction];
    const schedule = info[usesRailHolidayTimetable(serviceDay) ? 'holiday' : 'weekday'];
    const results = [];
    for (const [hourText, encoded] of Object.entries(schedule)) {
        const hour = Number(hourText);
        for (const token of encoded.split(' ')) {
            const parts = token.match(/^([A-G])([a-z])(\d{2})$/);
            if (!parts) continue;
            const min = Number(parts[3]);
            const departure = new Date(
                serviceDay.getFullYear(), serviceDay.getMonth(),
                serviceDay.getDate() + (hour < 4 ? 1 : 0), hour, min
            );
            results.push({
                departure,
                kind: info.types[parts[1]],
                destination: info.destinations[parts[2]]
            });
        }
    }
    return results;
}

function findUpcomingTrains(at, direction = trainDirection, limit = 3, matches = () => true) {
    const serviceDay = new Date(at.getFullYear(), at.getMonth(), at.getDate());
    // 0～2時台の終電は前日のダイヤに属する。
    if (at.getHours() < 3) serviceDay.setDate(serviceDay.getDate() - 1);
    const trains = [];
    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
        const day = new Date(serviceDay.getFullYear(), serviceDay.getMonth(), serviceDay.getDate() + dayOffset);
        trains.push(...getRailServiceDepartures(day, direction));
    }
    return trains
        .filter(train => train.departure.getTime() >= at.getTime() && matches(train))
        .sort((a, b) => a.departure - b.departure)
        .slice(0, limit);
}

function formatClock(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getTransferEstimate(nextBus, direction = trainDirection) {
    if (!nextBus) return null;
    const stationArrival = new Date(nextBus.departure.getTime() + BUS_TO_STATION_MINUTES * 60000);
    const platformReady = new Date(stationArrival.getTime() + STATION_TRANSFER_MINUTES * 60000);
    const candidates = findUpcomingTrains(platformReady, direction, 2, train =>
        !EXCLUDED_TRAIN_KINDS.has(train.kind) &&
        train.departure.getTime() - stationArrival.getTime() <= MAX_CONNECTION_WAIT_MINUTES * 60000
    ).map(train => ({
        ...train,
        waitMinutes: Math.floor((train.departure - stationArrival) / 60000),
        bufferMinutes: Math.floor((train.departure - platformReady) / 60000)
    }));
    return {
        stationArrival,
        platformReady,
        candidates
    };
}

function renderTrainDisplay(now, nextBus) {
    document.getElementById('train-section').hidden = currentDirection !== 'outbound';
    if (currentDirection !== 'outbound') return;
    const railServiceDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getHours() < 3 ? 1 : 0));
    const railHoliday = usesRailHolidayTimetable(railServiceDay);
    document.getElementById('train-daytype-badge').textContent = railHoliday ? '土日祝・予定' : '平日・予定';
    for (const direction of ['up', 'down']) {
        const button = document.getElementById(`train-${direction}`);
        const active = trainDirection === direction;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    }
    const arrival = document.getElementById('train-station-arrival');
    const list = document.getElementById('train-candidates');
    list.replaceChildren();
    if (!nextBus) {
        arrival.textContent = '本日の駅行きバスは終了しました';
        const item = document.createElement('li');
        item.className = 'train-candidate-empty';
        item.textContent = '次の運行日に乗り継ぎ候補を確認してね';
        list.appendChild(item);
        return;
    }
    const estimate = getTransferEstimate(nextBus);
    arrival.textContent = `バス ${formatClock(nextBus.departure)}発 → 駅 ${formatClock(estimate.stationArrival)}着見込み（予定）`;
    if (estimate.candidates.length === 0) {
        const item = document.createElement('li');
        item.className = 'train-candidate-empty';
        item.textContent = 'この時間帯に対象の電車はありません';
        list.appendChild(item);
        return;
    }
    for (const train of estimate.candidates) {
        const item = document.createElement('li');
        item.className = 'train-candidate';
        const departure = document.createElement('time');
        departure.className = 'train-candidate-time';
        departure.dateTime = train.departure.toISOString();
        departure.textContent = formatClock(train.departure);
        const departureUnit = document.createElement('small');
        departureUnit.className = 'train-candidate-departure-unit';
        departureUnit.textContent = '発';
        departure.appendChild(departureUnit);
        const route = document.createElement('span');
        route.className = 'train-candidate-route';
        const kind = document.createElement('span');
        kind.className = 'train-candidate-kind';
        kind.textContent = train.kind;
        const destination = document.createElement('span');
        destination.className = 'train-candidate-destination';
        destination.textContent = `${train.destination}行き${train.departure.toDateString() !== estimate.stationArrival.toDateString() ? '・翌日' : ''}`;
        route.append(kind, destination);
        const buffer = document.createElement('span');
        buffer.className = `train-candidate-buffer ${train.bufferMinutes >= 6 ? 'safe' : train.bufferMinutes >= 3 ? 'warning' : 'danger'}`;
        const wait = document.createElement('small');
        wait.textContent = `駅着後${train.waitMinutes}分`;
        const bufferValue = document.createElement('strong');
        bufferValue.textContent = `余裕${train.bufferMinutes}分`;
        buffer.append(wait, bufferValue);
        buffer.title = `駅到着から電車発車まで約${train.waitMinutes}分、駅構内の移動を5分と見込んだ余裕`;
        item.append(departure, route, buffer);
        list.appendChild(item);
    }
}

function selectDaytype(daytype) {
    selectedDaytype = daytype;
    renderTimetable();
}

function closeTimetable() {
    document.getElementById('timetable-view').hidden = true;
    document.getElementById('home-view').hidden = false;
    window.scrollTo(0, 0);
    updateCountdown();
    document.getElementById('timetable-open').focus();
}

function formatTime(bus) {
    return `${String(bus.hour).padStart(2, '0')}:${String(bus.min).padStart(2, '0')}`;
}

function findUpcomingBuses(now, limit = 3) {
    const timetable = timetableData[currentDirection].timetable[usesHolidayTimetable(now) ? 'holiday' : 'weekday'];
    const buses = [];
    for (let hour = now.getHours(); hour <= 23 && buses.length < limit; hour++) {
        for (const min of timetable[String(hour)] ?? []) {
            const departure = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, min);
            if (departure.getTime() >= now.getTime()) {
                buses.push({ hour, min, departure });
                if (buses.length === limit) break;
            }
        }
    }
    return buses;
}

function renderTimetable() {
    const activeData = timetableData[currentDirection];
    document.getElementById('timetable-departure').textContent = `${activeData.departure} 発`;
    document.getElementById('timetable-route').textContent = activeData.destination.replace(/\s*行$/, '') + '行き';
    for (const direction of ['outbound', 'inbound']) {
        const button = document.getElementById(`timetable-${direction}`);
        const isActive = direction === currentDirection;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    }
    for (const daytype of ['weekday', 'holiday']) {
        const button = document.getElementById(`timetable-${daytype}`);
        const isActive = daytype === selectedDaytype;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    }

    const now = new Date();
    const todayType = usesHolidayTimetable(now) ? 'holiday' : 'weekday';
    const todayBadge = document.getElementById('timetable-today-badge');
    const isToday = selectedDaytype === todayType;
    todayBadge.textContent = isToday ? '今日のダイヤ' : '別のダイヤを表示中';
    todayBadge.classList.toggle('timetable-today-off', !isToday);
    const next = findUpcomingBuses(now, 1)[0];
    const list = document.getElementById('timetable-body');
    list.replaceChildren();
    for (let hour = 5; hour <= 22; hour++) {
        const times = activeData.timetable[selectedDaytype][String(hour)] ?? [];
        if (times.length === 0) continue;

        const row = document.createElement('div');
        row.className = 'hour-row';
        const hourLabel = document.createElement('span');
        hourLabel.className = 'hour-label';
        hourLabel.textContent = `${hour}時`;
        row.appendChild(hourLabel);

        const minutes = document.createElement('div');
        minutes.className = 'minute-list';
        for (const min of times) {
            const chip = document.createElement('span');
            chip.className = 'minute-chip';
            chip.textContent = String(min).padStart(2, '0');
            if (isToday && next && next.hour === hour && next.min === min) {
                chip.classList.add('next');
                chip.title = '次のバス';
            }
            minutes.appendChild(chip);
        }
        row.appendChild(minutes);
        list.appendChild(row);
    }
}

function renderUpcoming(buses) {
    const list = document.getElementById('upcoming-list');
    list.replaceChildren();
    if (buses.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'empty-upcoming';
        empty.textContent = '本日の後続便はありません';
        list.appendChild(empty);
        return;
    }
    buses.forEach((bus, index) => {
        const row = document.createElement('li');
        const time = document.createElement('time');
        time.className = 'upcoming-time';
        time.textContent = formatTime(bus);
        const label = document.createElement('span');
        label.className = 'upcoming-label';
        label.textContent = index === 0 ? '次の次' : '3本目';
        row.append(time, label);
        list.appendChild(row);
    });
}

function updateCountdown() {
    for (const direction of ['outbound', 'inbound']) {
        const button = document.getElementById(`tab-${direction}`);
        const active = currentDirection === direction;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    }

    const activeData = timetableData[currentDirection];
    document.getElementById('departure-station').textContent = activeData.departure;
    document.getElementById('destination-station').textContent = activeData.destination.replace(/\s*行$/, '');

    const now = new Date();
    const type = usesHolidayTimetable(now) ? 'holiday' : 'weekday';
    document.getElementById('date-label').textContent =
        new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' }).format(now);
    document.getElementById('daytype-label').textContent = type === 'holiday' ? '土日祝ダイヤ' : '平日ダイヤ';

    const foundBuses = findUpcomingBuses(now, 3);
    renderUpcoming(foundBuses.slice(1));
    renderTrainDisplay(now, foundBuses[0]);
    const card = document.getElementById('countdown-card');
    const countdown = document.getElementById('minutes');
    const ended = document.getElementById('service-ended');
    const status = document.getElementById('countdown-status');
    const detailsText = document.getElementById('schedule-details');
    card.classList.remove('is-urgent', 'is-ended');
    if (foundBuses.length === 0) {
        countdown.hidden = true;
        ended.hidden = false;
        status.textContent = '本日の運行';
        detailsText.textContent = '本日のバスは終了しました';
        card.classList.add('is-ended');
        return;
    }

    const nextBus = foundBuses[0];
    const totalSeconds = Math.max(0, Math.ceil((nextBus.departure.getTime() - now.getTime()) / 1000));
    countdown.hidden = false;
    ended.hidden = true;
    document.getElementById('remaining-minutes').textContent = String(Math.floor(totalSeconds / 60));
    document.getElementById('remaining-seconds').textContent = String(totalSeconds % 60).padStart(2, '0');
    status.textContent = totalSeconds <= 180 ? 'まもなく発車' : '次のバスまで';
    detailsText.textContent = `${formatTime(nextBus)} 発`;
    if (totalSeconds <= 180) {
        card.classList.add('is-urgent');
    }
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
    .then(() => console.log('Service Worker 登録成功'))
    .catch(err => console.error('Service Worker 登録失敗', err));
}
