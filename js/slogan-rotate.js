(function () {
  'use strict';

  var config = window.SLOGAN_ROTATE_CONFIG || {};
  var phrases = Array.isArray(config.phrases) ? config.phrases.filter(Boolean) : [];
  var subtitle = document.getElementById('subtitle');

  if (!subtitle || phrases.length === 0) {
    return;
  }

  var minInterval = Math.max(1000, Number(config.min_interval) || 2500);
  var maxInterval = Math.max(minInterval, Number(config.max_interval) || 4500);
  var typeSpeed = Math.max(20, Number(config.type_speed) || 90);
  var eraseSpeed = Math.max(10, Number(config.erase_speed) || 45);
  var reduceMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var currentIndex = -1;

  function randomInterval() {
    return minInterval + Math.random() * (maxInterval - minInterval);
  }

  function nextIndex() {
    if (phrases.length === 1) {
      return 0;
    }

    var index = Math.floor(Math.random() * phrases.length);
    while (index === currentIndex) {
      index = Math.floor(Math.random() * phrases.length);
    }
    return index;
  }

  function typePhrase(index, complete) {
    var text = phrases[index];
    var charIndex = 0;
    subtitle.textContent = '';

    function typeNextCharacter() {
      if (charIndex >= text.length) {
        complete();
        return;
      }

      subtitle.textContent += text.charAt(charIndex);
      charIndex += 1;
      window.setTimeout(typeNextCharacter, typeSpeed);
    }

    typeNextCharacter();
  }

  function erasePhrase(complete) {
    function eraseNextCharacter() {
      if (!subtitle.textContent.length) {
        complete();
        return;
      }

      subtitle.textContent = subtitle.textContent.slice(0, -1);
      window.setTimeout(eraseNextCharacter, eraseSpeed);
    }

    eraseNextCharacter();
  }

  function rotateWithTyping() {
    currentIndex = nextIndex();
    typePhrase(currentIndex, function () {
      window.setTimeout(function () {
        erasePhrase(rotateWithTyping);
      }, randomInterval());
    });
  }

  function rotateWithoutTyping() {
    currentIndex = nextIndex();
    subtitle.textContent = phrases[currentIndex];
    window.setTimeout(rotateWithoutTyping, randomInterval());
  }

  var cursorStyle = document.createElement('style');
  cursorStyle.textContent = [
    '#subtitle.slogan-rotate::after {',
    '  content: "";',
    '  display: inline-block;',
    '  width: 2px;',
    '  height: 0.9em;',
    '  margin-left: 0.12em;',
    '  vertical-align: -0.08em;',
    '  background: currentColor;',
    '  animation: slogan-cursor-blink 0.9s step-end infinite;',
    '}',
    '@keyframes slogan-cursor-blink { 50% { opacity: 0; } }',
    '@media (prefers-reduced-motion: reduce) {',
    '  #subtitle.slogan-rotate::after { animation: none; }',
    '}'
  ].join('\n');
  document.head.appendChild(cursorStyle);
  subtitle.classList.add('slogan-rotate');

  if (reduceMotion) {
    rotateWithoutTyping();
  } else {
    rotateWithTyping();
  }
})();
