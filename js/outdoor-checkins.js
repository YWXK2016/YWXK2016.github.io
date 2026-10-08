(function () {
  'use strict';

  var script = document.currentScript;
  var dataUrl = (script && script.dataset.dataUrl) || '/data/outdoor-checkins.json';
  var assetRoot = '/img/outdoor/';
  var svgNamespace = 'http://www.w3.org/2000/svg';
  var curveColors = ['#177e89', '#c05d3c', '#2f875f', '#3b6fa0', '#c58a1f', '#8b5cf6', '#d14d72'];

  function asset(name) {
    if (!name) return '';
    return assetRoot + String(name).split('/').map(encodeURIComponent).join('/');
  }

  function formatDate(value) {
    if (!value) return '';
    var parts = String(value).split('-');
    if (parts.length !== 3) return value;
    return parts[0] + '.' + parts[1] + '.' + parts[2];
  }

  function sortedRecords(records) {
    return records.slice().sort(function (left, right) {
      return String(right.date || '').localeCompare(String(left.date || ''));
    });
  }

  function recordsFor(targetId, target, allRecords) {
    var exact = allRecords.filter(function (record) {
      return record.targetId === targetId;
    });

    if (exact.length || !target || target.type !== 'route' || !target.segmentCount) {
      return exact;
    }

    return allRecords.filter(function (record) {
      return String(record.targetId || '').indexOf(targetId + '-') === 0;
    });
  }

  function collectionItems(target) {
    return target && Array.isArray(target.itemIds) ? target.itemIds : [];
  }

  function collectionRecords(target, allRecords) {
    var itemIds = collectionItems(target);
    return allRecords.filter(function (record) {
      return itemIds.indexOf(record.targetId) !== -1;
    });
  }

  function completedItems(target, allRecords) {
    return collectionItems(target).filter(function (itemId) {
      return allRecords.some(function (record) {
        return record.targetId === itemId;
      });
    }).length;
  }

  function completedSegments(routeId, allRecords) {
    var ids = {};
    allRecords.forEach(function (record) {
      var targetId = String(record.targetId || '');
      if (targetId.indexOf(routeId + '-') === 0) {
        ids[targetId] = true;
      }
    });
    return Object.keys(ids).length;
  }

  function createBadge(text, done) {
    var badge = document.createElement('span');
    badge.className = 'outdoor-checkin-badge ' + (done ? 'outdoor-checkin-badge--done' : 'outdoor-checkin-badge--pending');
    badge.textContent = text;
    return badge;
  }

  function renderCard(card, data) {
    var targetId = card.dataset.checkinId;
    var target = data.targets[targetId] || {};
    var type = card.dataset.checkinType || target.type;
    var isCollection = collectionItems(target).length > 0;
    var records = sortedRecords(
      isCollection
        ? collectionRecords(target, data.records)
        : recordsFor(targetId, target, data.records)
    );
    var latest = records[0];
    var media = card.querySelector('.outdoor-card__media');
    var image = media && media.querySelector('img');
    var checkin = card.querySelector('.outdoor-card__checkin');
    var doneCount = isCollection
      ? completedItems(target, data.records)
      : (type === 'route' && target.segmentCount
        ? completedSegments(targetId, data.records)
        : records.length);
    var done = doneCount > 0;

    if (image) {
      image.src = asset(target.cover || (latest ? latest.image : ''));
      image.alt = target.title ? target.title + '打卡记录' : '户外打卡记录';
    }

    if (media) {
      media.classList.toggle('outdoor-card__media--pending', !done);
      media.appendChild(createBadge(done ? '已打卡' : '待打卡', done));

      if (done && type === 'peak' && !isCollection && records.length > 1) {
        var count = document.createElement('span');
        count.className = 'outdoor-checkin-count';
        count.textContent = records.length + ' 次';
        media.appendChild(count);
      }
    }

    if (checkin) {
      if (done) {
        checkin.classList.remove('outdoor-card__checkin--pending');
        checkin.innerHTML = '<strong>' +
          (isCollection
            ? '已打卡 ' + doneCount + ' / ' + collectionItems(target).length + ' 座'
            : (type === 'route' && target.segmentCount
              ? '已完成 ' + doneCount + ' / ' + target.segmentCount + ' 段'
              : '已打卡 ' + records.length + ' 次')) +
          '</strong><time>' + formatDate(latest.date) + '</time>';
      } else {
        checkin.classList.add('outdoor-card__checkin--pending');
        checkin.innerHTML = '<strong>待打卡</strong><span>等待记录</span>';
      }
    }
  }

  function svgElement(name, attributes) {
    var element = document.createElementNS(svgNamespace, name);
    Object.keys(attributes || {}).forEach(function (key) {
      element.setAttribute(key, attributes[key]);
    });
    return element;
  }

  function openCheckinImages(records, initialIndex) {
    var images = (records || []).filter(function (record) {
      return record && record.image;
    });
    if (!images.length) return;

    var currentIndex = Math.max(0, Math.min(images.length - 1, initialIndex || 0));
    var existing = document.querySelector('.outdoor-image-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.className = 'outdoor-image-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', '打卡图片');

    var backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.className = 'outdoor-image-modal__backdrop';
    backdrop.setAttribute('aria-label', '关闭图片');

    var content = document.createElement('div');
    content.className = 'outdoor-image-modal__content';

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'outdoor-image-modal__close';
    close.innerHTML = '<span aria-hidden="true">×</span>';
    close.setAttribute('aria-label', '关闭');

    var image = document.createElement('img');

    var caption = document.createElement('p');
    caption.className = 'outdoor-image-modal__caption';

    var previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'outdoor-image-modal__nav outdoor-image-modal__nav--prev';
    previous.innerHTML = '<i class="iconfont icon-arrowleft" aria-hidden="true"></i>';
    previous.setAttribute('aria-label', '上一张打卡图片');

    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'outdoor-image-modal__nav outdoor-image-modal__nav--next';
    next.innerHTML = '<i class="iconfont icon-arrowright" aria-hidden="true"></i>';
    next.setAttribute('aria-label', '下一张打卡图片');
    var multiple = images.length > 1;

    function renderImage() {
      var record = images[currentIndex];
      image.src = asset(record.image);
      image.alt = record.note || '户外打卡记录';
      caption.textContent = multiple
        ? '第 ' + (currentIndex + 1) + ' / ' + images.length + ' 次 · ' +
          formatDate(record.date) + (record.note ? ' · ' + record.note : '')
        : formatDate(record.date) + (record.note ? ' · ' + record.note : '');
      previous.disabled = currentIndex === 0;
      next.disabled = currentIndex === images.length - 1;
    }

    function closeModal() {
      document.removeEventListener('keydown', handleKeydown);
      modal.remove();
    }

    function handleKeydown(event) {
      if (event.key === 'Escape') closeModal();
      if (event.key === 'ArrowLeft' && currentIndex > 0) {
        currentIndex -= 1;
        renderImage();
      }
      if (event.key === 'ArrowRight' && currentIndex < images.length - 1) {
        currentIndex += 1;
        renderImage();
      }
    }

    backdrop.addEventListener('click', closeModal);
    close.addEventListener('click', closeModal);
    previous.addEventListener('click', function () {
      if (currentIndex > 0) {
        currentIndex -= 1;
        renderImage();
      }
    });
    next.addEventListener('click', function () {
      if (currentIndex < images.length - 1) {
        currentIndex += 1;
        renderImage();
      }
    });
    document.addEventListener('keydown', handleKeydown);

    renderImage();
    content.appendChild(close);
    if (multiple) {
      content.appendChild(previous);
      content.appendChild(next);
    }
    content.appendChild(image);
    content.appendChild(caption);
    modal.appendChild(backdrop);
    modal.appendChild(content);
    document.body.appendChild(modal);
    close.focus();
  }

  function openCheckinImage(record) {
    openCheckinImages([record], 0);
  }

  function createCurveNode(point, color) {
    var group = svgElement('g', {
      'class': 'outdoor-curve-node' + (point.record ? '' : ' outdoor-curve-node--pending'),
      role: 'button',
      tabindex: point.record ? '0' : '-1',
      'aria-label': point.tooltip || '暂未打卡'
    });
    group.style.color = color;

    var tooltip = svgElement('title');
    tooltip.textContent = point.tooltip || '暂未打卡';

    var halo = svgElement('circle', {
      cx: point.x,
      cy: point.y,
      r: 10,
      'class': 'outdoor-curve-node__halo'
    });

    var dot = svgElement('circle', {
      cx: point.x,
      cy: point.y,
      r: 6,
      'class': 'outdoor-curve-node__dot'
    });
    dot.style.fill = color;

    if (point.label) {
      var label = svgElement('text', {
        x: point.x,
        y: point.y + 21,
        'text-anchor': 'middle',
        'class': 'outdoor-curve-node__name'
      });
      label.textContent = point.label;
      label.style.fill = color;
      group.appendChild(label);
    }

    function activate(event) {
      if (!point.records || !point.records.length) return;
      event.preventDefault();
      openCheckinImages(point.records, point.records.length - 1);
    }

    if (point.records && point.records.length) {
      group.addEventListener('click', activate);
      group.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') activate(event);
      });
    }

    group.appendChild(tooltip);
    group.appendChild(halo);
    group.appendChild(dot);
    return group;
  }

  function createCheckinCurve(records, options) {
    options = options || {};
    var wrapper = document.createElement('div');
    wrapper.className = 'outdoor-checkin-curve';

    var ordered = options.items || records.slice().reverse().map(function (record) {
      return {
        record: record,
        records: [record],
        tooltip: formatDate(record.date) + (record.note ? ' · ' + record.note : '')
      };
    });

    if (options.style === 'wave' && ordered.length) {
      return createWaveCurve(ordered, wrapper);
    }

    var rows = 1;
    var capacity = 3;
    while (capacity < ordered.length) {
      rows += 1;
      capacity += 4;
    }

    var width = 720;
    var left = 72;
    var right = 648;
    var startY = 48;
    var rowGap = 108;
    var radius = 30;
    var height = Math.max(112, startY + (rows - 1) * rowGap + 48);
    if (!ordered.length) height = Math.max(height, startY + 104);
    var svg = svgElement('svg', {
      viewBox: '0 0 ' + width + ' ' + height,
      role: 'img',
      'aria-label': '打卡记录时间轴'
    });

    if (!ordered.length) {
      svg.appendChild(svgElement('path', {
        d: 'M ' + left + ' ' + startY + ' H ' + right +
          ' Q ' + (right + 24) + ' ' + startY + ' ' + (right + 24) + ' ' + (startY + 24) +
          ' V ' + (startY + 70) +
          ' Q ' + (right + 24) + ' ' + (startY + 94) + ' ' + (right - 24) + ' ' + (startY + 94) +
          ' H ' + (left + 24),
        'class': 'outdoor-curve-path outdoor-curve-path--empty'
      }));

      var emptyText = svgElement('text', {
        x: width / 2,
        y: startY - 22,
        'text-anchor': 'middle',
        'class': 'outdoor-curve-empty'
      });
      emptyText.textContent = '待打卡';
      svg.appendChild(emptyText);
      wrapper.appendChild(svg);
      return wrapper;
    }

    var points = [];
    var recordIndex = 0;

    function addPoint(record, options) {
      points.push(Object.assign({
        record: record,
        records: record && record.records,
        tooltip: record && record.tooltip,
        color: record && record.color,
        label: record && record.label,
        row: options.row,
        kind: options.kind,
        side: options.side,
        x: options.x,
        y: options.y
      }, options));
    }

    for (var row = 0; row < rows && recordIndex < ordered.length; row += 1) {
      var y = startY + row * rowGap;
      var travelsRight = row % 2 === 0;
      var side = travelsRight ? 'right' : 'left';

      if (row > 0) {
        var connectorSide = (row - 1) % 2 === 0 ? 'right' : 'left';
        addPoint(ordered[recordIndex], {
          row: row,
          kind: 'vertical',
          side: connectorSide,
          x: connectorSide === 'right' ? right : left,
          y: y - rowGap / 2
        });
        recordIndex += 1;
        if (recordIndex >= ordered.length) break;
      }

      var horizontalXs = travelsRight
        ? [left + (right - left) * 0.25, (left + right) / 2, left + (right - left) * 0.75]
        : [right - (right - left) * 0.25, (left + right) / 2, right - (right - left) * 0.75];

      for (var column = 0; column < horizontalXs.length && recordIndex < ordered.length; column += 1) {
        addPoint(ordered[recordIndex], {
          row: row,
          kind: 'horizontal',
          side: side,
          x: horizontalXs[column],
          y: y
        });
        recordIndex += 1;
      }
    }

    function edgePath(previous, current) {
      if (previous.kind === 'horizontal' && current.kind === 'horizontal' && previous.row === current.row) {
        return 'M ' + previous.x + ' ' + previous.y + ' H ' + current.x;
      }

      if (previous.kind === 'horizontal' && current.kind === 'vertical') {
        var edgeX = previous.side === 'right' ? right : left;
        var horizontalTarget = previous.side === 'right' ? edgeX - radius : edgeX + radius;
        var verticalTarget = previous.y + radius;
        return 'M ' + previous.x + ' ' + previous.y +
          ' H ' + horizontalTarget +
          ' Q ' + edgeX + ' ' + previous.y + ' ' + edgeX + ' ' + verticalTarget +
          ' V ' + current.y;
      }

      if (previous.kind === 'vertical' && current.kind === 'horizontal') {
        var turnX = previous.side === 'right' ? right : left;
        var curveStartY = current.y - radius;
        var curveEndX = previous.side === 'right' ? turnX - radius : turnX + radius;
        return 'M ' + previous.x + ' ' + previous.y +
          ' V ' + curveStartY +
          ' Q ' + turnX + ' ' + current.y +
          ' ' + curveEndX + ' ' + current.y +
          ' H ' + current.x;
      }

      return 'M ' + previous.x + ' ' + previous.y + ' L ' + current.x + ' ' + current.y;
    }

    if (points.length === 1) {
      var leadIn = svgElement('path', {
        d: 'M ' + (points[0].x - 20) + ' ' + points[0].y + ' H ' + (points[0].x + 20),
        'class': 'outdoor-curve-segment'
      });
      leadIn.style.stroke = points[0].color || curveColors[0];
      svg.appendChild(leadIn);
    } else {
      for (var edgeIndex = 0; edgeIndex < points.length - 1; edgeIndex += 1) {
        var pathData = edgePath(points[edgeIndex], points[edgeIndex + 1]);
        svg.appendChild(svgElement('path', {
          d: pathData,
          'class': 'outdoor-curve-path'
        }));
        var segmentPath = svgElement('path', {
          d: pathData,
          'class': 'outdoor-curve-segment'
        });
        segmentPath.style.stroke = points[edgeIndex + 1].color || curveColors[edgeIndex % curveColors.length];
        svg.appendChild(segmentPath);
      }
    }

    points.forEach(function (point, index) {
      var nodeColor = point.color || curveColors[index === 0 ? 0 : (index - 1) % curveColors.length];
      svg.appendChild(createCurveNode(point, nodeColor));
    });

    wrapper.appendChild(svg);
    return wrapper;
  }

  function createWaveCurve(ordered, wrapper) {
    wrapper.classList.add('outdoor-checkin-curve--wave');

    var padding = 60;
    var spacing = 150;
    var centerY = 82;
    var amplitude = 42;
    var width = Math.max(620, padding * 2 + (ordered.length - 1) * spacing);
    var height = 182;
    var svg = svgElement('svg', {
      viewBox: '0 0 ' + width + ' ' + height,
      role: 'img',
      'aria-label': '打卡记录波浪时间轴'
    });
    svg.style.minWidth = width + 'px';

    var points = ordered.map(function (item, index) {
      return Object.assign({}, item, {
        kind: 'wave',
        x: padding + index * spacing,
        y: centerY + (index % 2 === 0 ? -amplitude : amplitude)
      });
    });

    function wavePath(previous, current) {
      var deltaX = current.x - previous.x;
      return 'M ' + previous.x + ' ' + previous.y +
        ' C ' + (previous.x + deltaX * 0.38) + ' ' + previous.y +
        ', ' + (current.x - deltaX * 0.38) + ' ' + current.y +
        ', ' + current.x + ' ' + current.y;
    }

    for (var index = 0; index < points.length - 1; index += 1) {
      var pathData = wavePath(points[index], points[index + 1]);
      svg.appendChild(svgElement('path', {
        d: pathData,
        'class': 'outdoor-curve-path'
      }));
      var segmentPath = svgElement('path', {
        d: pathData,
        'class': 'outdoor-curve-segment'
      });
      segmentPath.style.stroke = points[index + 1].color || curveColors[index % curveColors.length];
      svg.appendChild(segmentPath);
    }

    points.forEach(function (point, index) {
      var nodeColor = point.color || curveColors[index === 0 ? 0 : (index - 1) % curveColors.length];
      svg.appendChild(createCurveNode(point, nodeColor));
    });

    wrapper.appendChild(svg);
    return wrapper;
  }

  function renderSegmentPanel(card, targetId, data) {
    if (card.querySelector('.outdoor-checkin-panel')) return;

    var body = card.querySelector('.szt-segment-card__body');
    if (!body) return;

    var records = sortedRecords(data.records.filter(function (record) {
      return record.targetId === targetId;
    }));
    var panel = document.createElement('div');
    panel.className = 'outdoor-checkin-panel';

    var head = document.createElement('div');
    head.className = 'outdoor-checkin-panel__head';

    var state = document.createElement('strong');
    state.textContent = records.length ? '已打卡' : '待打卡';
    head.appendChild(state);

    if (records.length) {
      var time = document.createElement('time');
      time.textContent = formatDate(records[0].date);
      head.appendChild(time);

      if (records.length > 1) {
        var count = document.createElement('span');
        count.textContent = records.length + ' 次记录';
        head.appendChild(count);
      }
    }

    panel.appendChild(head);

    panel.appendChild(createCheckinCurve(records));

    body.appendChild(panel);
  }

  function renderSegmentText(card, records) {
    if (card.querySelector('.outdoor-segment-record-text')) return;

    var body = card.querySelector('.szt-segment-card__body');
    if (!body) return;

    body.appendChild(createRecordText(records));
  }

  function createRecordText(records) {
    var wrapper = document.createElement('div');
    wrapper.className = 'outdoor-segment-record-text';
    var ordered = records.slice().sort(function (left, right) {
      return String(left.date || '').localeCompare(String(right.date || ''));
    });

    if (!ordered.length) {
      var pending = document.createElement('p');
      pending.textContent = '暂未打卡';
      wrapper.appendChild(pending);
    } else {
      ordered.forEach(function (record, index) {
        var item = document.createElement('button');
        item.type = 'button';
        item.className = 'outdoor-segment-record-text__button';
        item.innerHTML = '<span>第 ' + (index + 1) + ' 次打卡 · ' + formatDate(record.date) +
          '</span><i class="iconfont icon-arrowright" aria-hidden="true"></i>';
        item.title = '点击查看打卡图片';
        item.addEventListener('click', function () {
          openCheckinImages(ordered, index);
        });
        wrapper.appendChild(item);
      });
    }

    return wrapper;
  }

  function renderRouteRecordText(summary, records) {
    if (!summary || !records.length) return;
    if (summary.nextElementSibling && summary.nextElementSibling.classList.contains('outdoor-route-record-text')) {
      return;
    }

    var wrapper = createRecordText(records);
    wrapper.classList.add('outdoor-route-record-text');
    summary.insertAdjacentElement('afterend', wrapper);
  }

  function cardFact(card, labelText) {
    var matched = '';

    card.querySelectorAll('.szt-fact').forEach(function (fact) {
      var label = fact.querySelector('.szt-fact__label');
      var value = fact.querySelector('.szt-fact__value');
      if (matched || !label || !value || label.textContent.trim() !== labelText) return;
      matched = value.textContent.trim();
    });

    return matched;
  }

  function segmentDistances(container) {
    var distances = {};

    container.querySelectorAll('.szt-segment-card').forEach(function (card, index) {
      var title = card.querySelector('.szt-segment-card__title');
      var match = title && title.textContent.match(/第\s*(\d+)\s*段/);
      var segment = match ? Number(match[1]) : index + 1;
      var distance = cardFact(card, '距离').split(/[，,]/)[0].trim();

      if (distance) distances[segment] = distance;
    });

    return distances;
  }

  function peakElevations(container) {
    var elevations = {};

    container.querySelectorAll('.szt-segment-card[data-checkin-id]').forEach(function (card) {
      var elevation = cardFact(card, '海拔');
      if (elevation) elevations[card.dataset.checkinId] = elevation;
    });

    return elevations;
  }

  function renderRouteOverview(container, collection, data) {
    var segmentList = container.querySelector('.szt-segment-list');
    if (!segmentList || container.querySelector('.outdoor-route-overview')) return;

    var overview = document.createElement('div');
    overview.className = 'outdoor-route-overview';

    var distances = segmentDistances(container);

    var head = document.createElement('div');
    head.className = 'outdoor-route-overview__head';
    var target = data.targets[collection] || {};
    var segmentCount = target.segmentCount || 0;
    head.innerHTML = '<strong>' + target.title + '分段打卡进度</strong><span>' + segmentCount + ' 段</span>';
    overview.appendChild(head);

    var items = [];
    for (var segment = 1; segment <= segmentCount; segment += 1) {
      var records = data.records
        .filter(function (record) {
          return record.targetId === collection + '-' + segment;
        })
        .sort(function (left, right) {
          return String(left.date || '').localeCompare(String(right.date || ''));
        });

      var first = records[0];
      var last = records[records.length - 1];
      var distance = distances[segment];
      items.push({
        record: last || null,
        records: records,
        tooltip: records.length
          ? '已打卡 ' + records.length + ' 次 · 最近一次 ' + formatDate(last.date)
          : '暂未打卡',
        color: records.length ? curveColors[(segment - 1) % curveColors.length] : '#a8b3ac',
        label: '第 ' + segment + ' 段' + (distance ? '（' + distance + '）' : '')
      });
    }

    overview.appendChild(createCheckinCurve([], {
      items: items,
      style: target.curveStyle
    }));
    segmentList.parentNode.insertBefore(overview, segmentList);
  }

  function renderCollection(container, data) {
    var collection = container.dataset.checkinCollection;
    if (!collection) return;

    var segmentCards = container.querySelectorAll('.szt-segment-card');
    var target = data.targets[collection] || {};
    segmentCards.forEach(function (card, index) {
      var title = card.querySelector('.szt-segment-card__title');
      var match = title && title.textContent.match(/第\s*(\d+)\s*段/);
      var segment = match ? Number(match[1]) : index + 1;
      var records = data.records.filter(function (record) {
        return record.targetId === collection + '-' + segment;
      });

      if (target.segmentCount) {
        renderSegmentText(card, records);
      }
    });

    if (target.segmentCount) {
      renderRouteOverview(container, collection, data);
    }

    var summary = container.querySelector('[data-checkin-route-summary]');
    if (summary) {
      var target = data.targets[collection] || {};
      var routeRecords = recordsFor(collection, target, data.records);
      var total = target.segmentCount;
      var done = completedSegments(collection, data.records);
      var orderedRouteRecords = sortedRecords(routeRecords);
      var value;

      if (!orderedRouteRecords.length) {
        value = '暂未打卡';
      } else if (total) {
        value = '已完成 ' + done + ' / ' + total + ' 段 · 最近 ' + formatDate(orderedRouteRecords[0].date);
      } else {
        value = '已打卡 ' + orderedRouteRecords.length + ' 次 · 最近 ' + formatDate(orderedRouteRecords[0].date);
      }

      summary.innerHTML = '<span><strong>个人打卡</strong> ' + value + '</span>';
      if (!total) {
        renderRouteRecordText(summary, orderedRouteRecords);
      }
    }
  }

  function renderPeakCollection(container, data) {
    var collection = container.dataset.checkinPeakCollection;
    if (!collection) return;

    var target = data.targets[collection] || {};
    var itemIds = collectionItems(target);
    if (!itemIds.length) return;

    var records = sortedRecords(collectionRecords(target, data.records));
    var done = completedItems(target, data.records);
    var summary = container.querySelector('[data-checkin-route-summary]');

    if (summary) {
      var value = records.length
        ? '已打卡 ' + done + ' / ' + itemIds.length + ' 座 · 最近 ' + formatDate(records[0].date)
        : '暂未打卡';
      summary.innerHTML = '<span><strong>个人打卡</strong> ' + value + '</span>';
    }

    var list = container.querySelector('.szt-segment-list');
    if (list && !container.querySelector('.outdoor-peak-overview')) {
      var overview = document.createElement('div');
      overview.className = 'outdoor-route-overview outdoor-peak-overview';

      var head = document.createElement('div');
      head.className = 'outdoor-route-overview__head';
      head.innerHTML = '<strong>' + target.title + '打卡进度</strong><span>' +
        done + ' / ' + itemIds.length + ' 座</span>';
      overview.appendChild(head);

      var elevations = peakElevations(container);

      var items = itemIds.map(function (itemId, index) {
        var itemTarget = data.targets[itemId] || {};
        var itemRecords = data.records
          .filter(function (record) {
            return record.targetId === itemId;
          })
          .sort(function (left, right) {
            return String(left.date || '').localeCompare(String(right.date || ''));
          });
        var latest = itemRecords[itemRecords.length - 1];
        var elevation = elevations[itemId];

        return {
          record: latest || null,
          records: itemRecords,
          tooltip: itemRecords.length
            ? '已打卡 ' + itemRecords.length + ' 次 · 最近一次 ' + formatDate(latest.date)
            : '暂未打卡',
          color: itemRecords.length ? curveColors[index % curveColors.length] : '#a8b3ac',
          label: (itemTarget.title || itemId) + (elevation ? '（' + elevation + '）' : '')
        };
      });

      overview.appendChild(createCheckinCurve([], { items: items }));
      list.parentNode.insertBefore(overview, list);
    }

    container.querySelectorAll('.szt-segment-card[data-checkin-id]').forEach(function (card) {
      var targetId = card.dataset.checkinId;
      var itemRecords = data.records
        .filter(function (record) {
          return record.targetId === targetId;
        })
        .sort(function (left, right) {
          return String(left.date || '').localeCompare(String(right.date || ''));
        });
      renderSegmentText(card, itemRecords);
    });
  }

  function renderProgress(data) {
    var peakTargets = Object.keys(data.targets).filter(function (id) {
      return data.targets[id].type === 'peak';
    });
    var checkedPeaks = peakTargets.filter(function (id) {
      return data.records.some(function (record) {
        return record.targetId === id;
      });
    }).length;

    var progress = {
      peaks: {
        value: checkedPeaks,
        total: peakTargets.length
      },
      kunpeng: {
        value: completedSegments('kunpeng', data.records),
        total: data.targets.kunpeng.segmentCount || 20
      }
    };
    var values = {
      peaks: progress.peaks.value + ' / ' + progress.peaks.total,
      kunpeng: progress.kunpeng.value + ' / ' + progress.kunpeng.total,
      records: String(data.records.length)
    };

    document.querySelectorAll('[data-outdoor-progress]').forEach(function (node) {
      var key = node.dataset.outdoorProgress;
      if (values[key]) node.textContent = values[key];
    });

    document.querySelectorAll('[data-outdoor-progress-bar]').forEach(function (node) {
      var key = node.dataset.outdoorProgressBar;
      var item = progress[key];
      if (!item || !item.total) return;

      var percent = Math.max(0, Math.min(100, (item.value / item.total) * 100));
      var fill = node.querySelector('[data-outdoor-progress-fill="' + key + '"]');
      if (fill) fill.style.width = percent.toFixed(1) + '%';
      node.setAttribute('aria-valuemin', '0');
      node.setAttribute('aria-valuemax', String(item.total));
      node.setAttribute('aria-valuenow', String(item.value));
    });
  }

  fetch(dataUrl)
    .then(function (response) {
      if (!response.ok) throw new Error('Failed to load outdoor check-ins');
      return response.json();
    })
    .then(function (data) {
      document.querySelectorAll('[data-checkin-id]').forEach(function (card) {
        renderCard(card, data);
      });
      document.querySelectorAll('[data-checkin-collection]').forEach(function (container) {
        renderCollection(container, data);
      });
      document.querySelectorAll('[data-checkin-peak-collection]').forEach(function (container) {
        renderPeakCollection(container, data);
      });
      renderProgress(data);
    })
    .catch(function (error) {
      console.error('[outdoor] Unable to render check-in data:', error);
    });
})();
