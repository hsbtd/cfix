(() => {
  'use strict';

  const filterLabels = {
    search: 'Search',
    building: 'Building',
    floor: 'Floor',
    capacity: 'Minimum seats',
    type: 'Room type',
    status: 'Status',
    equipment: 'Equipment'
  };

  function activeRoomFilters() {
    return Object.entries(filters).filter(([key, value]) =>
      key !== 'report' && key !== 'sort' && value !== ''
    );
  }

  function renderRoomFilterExtras() {
    if (page !== 'rooms') return;

    const bar = document.querySelector('.filters');
    const results = document.querySelector('#roomresults');
    if (!bar || !results) return;

    bar.classList.add('roomfilters');

    let summary = document.querySelector('#roomsummary');
    if (!summary) {
      summary = document.createElement('div');
      summary.id = 'roomsummary';
      summary.className = 'filter-summary';
      summary.setAttribute('role', 'status');
      summary.setAttribute('aria-live', 'polite');
      bar.insertAdjacentElement('afterend', summary);
    }

    let chips = document.querySelector('#roomchips');
    if (!chips) {
      chips = document.createElement('div');
      chips.id = 'roomchips';
      chips.className = 'filter-chips';
      bar.insertAdjacentElement('afterend', chips);
    }

    const count = results.querySelectorAll('.roomcard').length;
    const active = activeRoomFilters();
    summary.innerHTML = `<strong>${count}</strong> room${count === 1 ? '' : 's'} shown${active.length ? ` · ${active.length} filter${active.length === 1 ? '' : 's'} active` : ''}`;

    chips.innerHTML = active.map(([key, value]) =>
      `<span class="filter-chip"><span>${esc(filterLabels[key] || key)}: ${esc(value)}</span><button type="button" data-remove-filter="${esc(key)}" aria-label="Remove ${esc(filterLabels[key] || key)} filter">×</button></span>`
    ).join('');
    chips.hidden = active.length === 0;
  }

  function normalizeSectionBranding() {
    document.querySelectorAll('.howsection .eyebrow').forEach(label => {
      if (label.textContent.trim().toLowerCase() === 'what cfix is for') {
        label.textContent = 'WHAT CFIX IS FOR';
      }
    });
  }

  function enhanceRoomCards() {
    document.querySelectorAll('.roomcard').forEach(card => {
      const detailButton = card.querySelector('[data-detail]');
      const roomId = detailButton?.dataset.detail;
      const currentRoom = roomId ? room(roomId) : null;
      if (!currentRoom) return;

      card.dataset.roomId = roomId;
      const meta = card.querySelector('.roommeta');
      if (meta && !meta.querySelector('.room-feature')) {
        const aircon = currentRoom.equipment.includes('Air conditioning');
        meta.insertAdjacentHTML('beforeend', `<span class="room-feature ${aircon ? 'has-aircon' : 'no-aircon'}">${aircon ? '❄ Aircon' : '◌ No aircon'}</span>`);
      }

      card.querySelectorAll('[data-checkin]').forEach(button => {
        button.setAttribute('aria-label', `${button.textContent.trim()} ${currentRoom.name}`);
      });
      card.querySelectorAll('[data-detail]').forEach(button => {
        button.setAttribute('aria-label', `View details for ${currentRoom.name}`);
      });
    });
  }

  function renderMobileSchedules() {
    if (page !== 'schedules') return;
    const table = [...document.querySelectorAll('table')].find(candidate =>
      candidate.querySelector('th')?.textContent.trim() === 'ROOM'
    );
    if (!table || table.parentElement.querySelector('.schedule-mobile-list')) return;

    const rows = [...table.querySelectorAll('tbody tr')];
    const list = document.createElement('div');
    list.className = 'schedule-mobile-list';
    list.innerHTML = rows.map(row => {
      const cells = [...row.querySelectorAll('td')].map(cell => cell.textContent.trim());
      const action = row.querySelector('button')?.outerHTML || '';
      return `<article class="schedule-card">
        <div class="schedule-card-top"><span class="schedule-card-room">${esc(cells[0] || 'Room')}</span><span class="schedule-card-time">${esc(cells[3] || '')}</span></div>
        <h3>${esc(cells[1] || 'Class or activity')}</h3>
        <p>${esc(cells[2] || 'Faculty not listed')}</p>
        <div class="schedule-card-bottom"><span>${esc(cells[4] || '')}</span>${action}</div>
      </article>`;
    }).join('') || '<div class="empty">No class schedules yet.</div>';
    table.parentElement.appendChild(list);
  }

  function enhanceFeedbackAndAccessibility() {
    const toast = document.querySelector('#toast');
    if (toast) toast.setAttribute('aria-live', 'polite');

    document.querySelectorAll('.empty').forEach(empty => {
      empty.setAttribute('role', 'status');
    });

    const main = document.querySelector('#main');
    if (main) main.setAttribute('tabindex', '-1');
  }

  function registerPwa() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}), { once: true });
  }

  function refreshRoomResults() {
    if (page !== 'rooms') return;
    const results = document.querySelector('#roomresults');
    if (!results) return;
    results.innerHTML = filteredRooms();
    renderRoomFilterExtras();
  }

  const baseRender = render;
  render = () => {
    baseRender();
    renderRoomFilterExtras();
    normalizeSectionBranding();
    enhanceRoomCards();
    renderMobileSchedules();
    enhanceFeedbackAndAccessibility();
  };

  const baseDetail = detail;
  detail = id => {
    baseDetail(id);
    const r = room(id);
    const body = document.querySelector('#modalBody');
    if (!r || !body) return;
    const status = E.status(db, r);
    body.insertAdjacentHTML('afterbegin', `
      <div class="room-detail-stats" aria-label="Room summary">
        <div><span>STATUS</span><strong>${esc(status)}</strong></div>
        <div><span>CAPACITY</span><strong>${r.capacity} seats</strong></div>
        <div><span>FLOOR</span><strong>Floor ${r.floor}</strong></div>
      </div>
    `);
  };

  document.addEventListener('change', event => {
    const field = event.target.closest('[data-filter]');
    if (!field || page !== 'rooms') return;
    filters[field.dataset.filter] = field.value;
    refreshRoomResults();
  });

  document.addEventListener('input', event => {
    if (page === 'rooms' && event.target.matches('[data-filter]')) {
      renderRoomFilterExtras();
    }
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-remove-filter]');
    if (!button || page !== 'rooms') return;
    delete filters[button.dataset.removeFilter];
    refreshRoomResults();
  });

  renderRoomFilterExtras();
  normalizeSectionBranding();
  enhanceRoomCards();
  renderMobileSchedules();
  enhanceFeedbackAndAccessibility();
  registerPwa();
})();
