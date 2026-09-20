(function () {
  'use strict';

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () {
        return legacyCopyText(text);
      });
    }

    return legacyCopyText(text);
  }

  function legacyCopyText(text) {
    return new Promise(function (resolve, reject) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();

      try {
        document.execCommand('copy');
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        textarea.remove();
      }
    });
  }

  function showToast(message) {
    var toast = document.querySelector('[data-post-share-toast]');
    if (!toast) {
      toast = document.createElement('div');
      toast.setAttribute('data-post-share-toast', '');
      toast.style.cssText = [
        'position:fixed',
        'left:50%',
        'bottom:2rem',
        'z-index:2000',
        'transform:translateX(-50%)',
        'padding:.6rem .9rem',
        'border-radius:6px',
        'color:#fff',
        'background:rgba(0,0,0,.78)',
        'font-size:.85rem',
        'pointer-events:none',
        'opacity:0',
        'transition:opacity .2s ease'
      ].join(';');
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = '1';
    window.clearTimeout(toast.hideTimer);
    toast.hideTimer = window.setTimeout(function () {
      toast.style.opacity = '0';
    }, 1800);
  }

  function openShareWindow(url) {
    window.open(url, '_blank', 'noopener,noreferrer,width=720,height=620');
  }

  function isWechatBrowser() {
    return /micromessenger/i.test(navigator.userAgent);
  }

  function fallbackShare(message) {
    copyText(window.location.href)
      .then(function () {
        showToast(message);
      })
      .catch(function () {
        showToast('请点击浏览器右上角菜单进行分享');
      });
  }

  function initPostShare() {
    document.querySelectorAll('[data-post-share]').forEach(function (bar) {
      if (bar.dataset.initialized === 'true') {
        return;
      }
      bar.dataset.initialized = 'true';

      bar.addEventListener('click', function (event) {
        var button = event.target.closest('[data-share]');
        if (!button) {
          return;
        }

        var pageUrl = window.location.href;
        var pageTitle = document.title;
        var shareType = button.dataset.share;

        if (shareType === 'copy') {
          copyText(pageUrl).then(function () {
            showToast('文章链接已复制');
          });
          return;
        }

        if (shareType === 'wechat' || shareType === 'moments') {
          var isMoments = shareType === 'moments';

          if (isWechatBrowser()) {
            fallbackShare(isMoments
              ? '请点击右上角菜单分享到朋友圈，链接已复制'
              : '请点击右上角菜单分享给朋友，链接已复制');
            return;
          }

          if (navigator.share) {
            navigator.share({ title: pageTitle, text: pageTitle, url: pageUrl }).catch(function (error) {
              if (error && error.name === 'AbortError') {
                return;
              }
              fallbackShare(isMoments
                ? '链接已复制，请到微信朋友圈粘贴分享'
                : '链接已复制，请到微信中粘贴分享');
            });
          } else {
            fallbackShare(isMoments
              ? '链接已复制，请到微信朋友圈粘贴分享'
              : '链接已复制，请到微信中粘贴分享');
          }
          return;
        }

        if (shareType === 'weibo') {
          openShareWindow(
            'https://service.weibo.com/share/share.php?url='
              + encodeURIComponent(pageUrl)
              + '&title='
              + encodeURIComponent(pageTitle)
          );
          return;
        }

        if (shareType === 'qq') {
          openShareWindow(
            'https://connect.qq.com/widget/shareqq/index.html?url='
              + encodeURIComponent(pageUrl)
              + '&title='
              + encodeURIComponent(pageTitle)
          );
          return;
        }

        if (shareType === 'twitter') {
          openShareWindow(
            'https://twitter.com/intent/tweet?url='
              + encodeURIComponent(pageUrl)
              + '&text='
              + encodeURIComponent(pageTitle)
          );
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPostShare);
  } else {
    initPostShare();
  }
})();
