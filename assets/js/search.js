window.initSearch = (inputId, resultsId, viewId, searchHistory, gettingStarted) => {
  const input = document.getElementById(inputId);
  const results = document.getElementById(resultsId);
  const view = document.getElementById(viewId);
  let stack = Promise.resolve(); 
  let selectedItem = document.querySelector('li.selected');
  let recording = false;
  let historyTimeout;
  
  initItemContent();
  
  input.addEventListener('input', () => {
    const text = input.value;
    
    startRecordMetric();

    if (text.trim() !== '') {
      stack = stack
      .then(() => request('GET', `http://localhost:${window.PORT}/search?text=${text}`))
      .then(res => {
        results.innerHTML = res;
        if (results.childNodes.length > 0) {
          selectNextItem();
        } else {
          view.innerHTML = '';
        }
      }).catch(err => {
        console.log(err.message);
      });
    } else {
      stack = stack.then(() => {
        clearSearch();
      });
    }
  });

  document.body.addEventListener('click', (e) => {
    if (e.target.nodeName === 'LI' && e.target.hasAttribute('data-id')) {
      input.value = e.target.getAttribute('data-id');
      selectItem(e.target);
    }
  });

  document.body.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      selectPreviousItem();
    } else if (e.key === 'ArrowDown') {
      selectNextItem();
    }
  });

  if (!document.querySelector('li')) {
    clearSearch();
  }
  
  function clearSearch() {
    results.innerHTML = '<p class="grim">Type any identifier above to search docs, popular patterns, signatures and more.</p>';
    view.innerHTML = `
    <h4>${searchHistory ? 'Search History' : 'Examples to get you started'}</h4>
    <ul class="history">${
      (searchHistory ? searchHistory : gettingStarted)
      .map(i => `<li data-id="${i}">${i}</li>`)
      .join('')
    }</ul>`;
  }
  
  function startRecordMetric() {
    if (!recording) {
      recording = true;
      window.requestGet('/count?metric=requested&name=active_search');

      setTimeout(() => {
        if (view && view.querySelector('.scroll-wrapper *')) {
          window.requestGet('/count?metric=fulfilled&name=active_search');
        }

        recording = false;
      }, 1000);
    }
  }

  function selectNextItem() {
    if (results.childNodes.length === 0) { return; }

    if (selectedItem && selectedItem.nextSibling) {
      selectItem(selectedItem.nextSibling);
    } else {
      selectItem(results.firstChild);
    }
  }

  function selectPreviousItem() {
    if (results.childNodes.length === 0) { return; }

    if (selectedItem && selectedItem.previousSibling) {
      selectItem(selectedItem.previousSibling);
    } else {
      selectItem(results.lastChild);
    }
  }

  function selectItem(item) {
    selectedItem && selectedItem.classList.remove('selected');
    selectedItem = item;
    selectedItem.classList.add('selected');
    loadItem(item.getAttribute('data-id'));
    scrollTo(item);
  }

  function loadItem(id) {
    clearTimeout(historyTimeout);
    view.style.display = '';
    request('GET', `http://localhost:${window.PORT}/view?id=${id}`).then(html => {
      view.innerHTML = html;
      initItemContent();

      historyTimeout = setTimeout(() => {
        requestPost('/search/stack', {q: input.value}).then(data => {
          searchHistory = JSON.parse(data);
        });
      }, 1000);
    });
  }

  function initItemContent() {
    // if (document.querySelector('.sections-wrapper')) {
    //   const sticky = new StickyTitle(
    //     document.querySelectorAll('h4'), 
    //     document.querySelector('.sections-wrapper')
    //   );
    // }
    createJumpTo();
    handleExternalLinks();
    handleCollapsibles();
  }

  function scrollTo(target) {
    const containerBounds = results.getBoundingClientRect();
    const scrollTop = results.scrollTop;
    const targetTop = target.offsetTop;
    const targetBottom = targetTop + target.offsetHeight;

    if (targetTop < scrollTop) {
      results.scrollTop = targetTop;
    } else if (targetBottom > scrollTop + containerBounds.height) {
      results.scrollTop = targetBottom - containerBounds.height;
    }
  }
}
