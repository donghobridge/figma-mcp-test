// Theme Toggle Logic (Runs immediately)
(function () {
  const userTheme = localStorage.getItem('theme');
  if (userTheme === 'dark') {
    enableDarkMode();
  }
})();

function updateThemeButtons(theme) {
  const $elDark = document.querySelector('.js-theme-dark');
  const $elLight = document.querySelector('.js-theme-light');

  if (!$elDark || !$elLight) return;

  if (theme === 'dark') {
    $elDark.setAttribute('hidden', '');
    $elLight.removeAttribute('hidden');
  } else {
    $elDark.removeAttribute('hidden');
    $elLight.setAttribute('hidden', '');
  }
}

function applyTheme(theme) {
  // Dark tokens are already loaded via /import.css ([data-theme="dark"]).
  // Only toggle the attribute — do not inject a separate tokens.dark.css link.
  const link = document.querySelector('#theme-dark-css');
  if (link) link.remove();

  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  localStorage.setItem('theme', theme);
  updateThemeButtons(theme);
}

function enableDarkMode() {
  applyTheme('dark');
}

function disableDarkMode() {
  applyTheme('light');
}

function initThemeMode() {
  const savedTheme = localStorage.getItem('theme') || 'light';

  // 테마 CSS는 최대한 빨리 적용
  applyTheme(savedTheme);

  // 버튼은 DOM 생성 후 한 번 더 적용
  document.addEventListener('DOMContentLoaded', function () {
    updateThemeButtons(savedTheme);
  });
}

initThemeMode();

// Global Delegation for Theme Buttons (Safe to run immediately)
document.addEventListener('click', function (e) {
  const target = e.target.closest('button');
  if (!target) return;

  if (target.classList.contains('js-theme-dark')) {
    enableDarkMode();
    updateLogoForTheme(); // 테마 변경 시 로고 업데이트
  }
  if (target.classList.contains('js-theme-light')) {
    disableDarkMode();
    updateLogoForTheme(); // 테마 변경 시 로고 업데이트
  }
});

// 테마 변경 시 로고 업데이트 함수
function updateLogoForTheme() {
  const gnb = document.querySelector(".gnb");
  const logoLink = document.querySelector(".gnb__logo-link");

  if (!gnb || !logoLink || window.innerWidth >= 1024) return;

  const isDarkMode = localStorage.getItem('theme') === 'dark';
  const hasVisual = gnb.classList.contains("is-visual");

  // 라이트모드 + is-visual 있을 때만 white 클래스 추가
  if (hasVisual && !isDarkMode) {
    logoLink.classList.add("white");
  } else {
    logoLink.classList.remove("white");
  }
}

// GNB
(function () {
  const DESKTOP_WIDTH = 1024;
  const HEADER_HEIGHT = 56;
  const SCROLL_THRESHOLD = 40;
  const SCROLLSPY_OFFSET_RATIO = 0.3;
  const DEBOUNCE_DELAY = 100;

  function isDesktop() {
    return window.innerWidth >= DESKTOP_WIDTH;
  }

  function waitForElement(selector, callback, timeout = 5000) {
    const found = document.querySelector(selector);
    if (found) {
      callback(found);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (!el) return;

      observer.disconnect();
      callback(el);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => observer.disconnect(), timeout);
  }

  waitForElement(".gnb", initGNB);

  function initGNB(gnbContainer) {
    if (gnbContainer.dataset.gnbInitialized === "true") return;
    gnbContainer.dataset.gnbInitialized = "true";

    const gnbNav = gnbContainer.querySelector(".gnb__nav");
    const gnbMain = gnbContainer.querySelector(".gnb__main");
    const toggleMenuBtn = gnbContainer.querySelector(".gnb__menu-toggle");
    const closeMenuBtn = gnbContainer.querySelector(".gnb__menu-close");
    const gnbSubMenuFilter = gnbContainer.querySelector(".gnb__submenu--filter");
    const gnbSubMenusContainer = gnbContainer.querySelector(".gnb__submenus");
    const gnbSubMenus = gnbContainer.querySelectorAll(".gnb__nav-submenu");
    const depth1MenuItems = gnbContainer.querySelectorAll(".gnb__nav-item");
    const gnbNavLinks = gnbContainer.querySelectorAll(".gnb__nav-item .gnb__nav-link");
    const gnbNavList = gnbContainer.querySelector(".gnb__nav-list");
    const gnbNavListWrapper = gnbContainer.querySelector(".gnb__nav-list-wrapper");
    const gnbNavToggle = gnbContainer.querySelector(".gnb__nav-toggle");
    const gnbMobileHeader = gnbContainer.querySelector(".gnb__mobile-header");
    const logoLink = gnbContainer.querySelector(".gnb__logo-link");
    const hoverContents = gnbContainer.querySelectorAll(".gnb__nav-submenu-item-content-wrapper");
    const mobileSearchBar = gnbContainer.querySelector('.gnb__mobile-search-bar');

    if (!gnbNav) return;

    let prevScroll = window.scrollY;
    let isGnbHovered = false;
    let scrollSpyTimer = null;
    let resizeTimer = null;

    if (mobileSearchBar) {
      mobileSearchBar.addEventListener('click', function () {
        if (!gnbNav) return;

        gnbNav.classList.add('is-search');
      });
    }

    function resetDesktopSubmenus() {
      if (gnbSubMenusContainer) gnbSubMenusContainer.classList.remove("active");
      if (gnbSubMenuFilter) gnbSubMenuFilter.classList.remove("active");
      if (gnbMain) gnbMain.classList.remove("has-active-submenu");

      gnbSubMenus.forEach((submenu) => submenu.classList.remove("active"));
      depth1MenuItems.forEach((item) => item.classList.remove("active"));
    }

    function updateVisualState() {
      const isDarkMode = localStorage.getItem("theme") === "dark";

      if (isDesktop()) {
        if (toggleMenuBtn) toggleMenuBtn.classList.remove("active");
        if (logoLink) logoLink.classList.remove("white");
        return;
      }

      if (gnbContainer.classList.contains("is-visual")) {
        if (toggleMenuBtn) toggleMenuBtn.classList.add("active");
        if (logoLink && !isDarkMode) logoLink.classList.add("white");
      } else {
        if (toggleMenuBtn) toggleMenuBtn.classList.remove("active");
        if (logoLink) logoLink.classList.remove("white");
      }
    }

    function handleStickyNav() {
      if (!gnbNavListWrapper) return;

      const shouldFix = !isDesktop() && gnbNav.scrollTop > SCROLL_THRESHOLD;

      gnbNavListWrapper.classList.toggle("fixed", shouldFix);
      if (gnbMobileHeader) {
        gnbMobileHeader.classList.toggle("is-scrolled", shouldFix);
      }
    }

    function updateActiveNavLink(activeLink) {
      gnbNavLinks.forEach((link) => {
        link.classList.remove("active");
        if (link.parentElement) link.parentElement.classList.remove("active");
      });

      if (!activeLink) return;

      activeLink.classList.add("active");
      if (activeLink.parentElement) {
        activeLink.parentElement.classList.add("active");
      }

      if (gnbNavList && activeLink.parentElement) {
        gnbNavList.scrollTo({
          left: activeLink.parentElement.offsetLeft - 24,
          behavior: "smooth",
        });
      }
    }

    function getSubmenuTop(submenu) {
      let top = submenu.offsetTop;

      if (submenu.offsetParent && submenu.offsetParent !== gnbNav) {
        top += submenu.offsetParent.offsetTop;
      }

      return top;
    }

    function handleMobileAnchorClick(e) {
      if (isDesktop()) return;

      const targetId = this.getAttribute("data-menu-target");
      const targetSubmenu = targetId ? document.getElementById(targetId) : null;

      if (!targetSubmenu) return;

      e.preventDefault();

      const chipsHeight = gnbNavListWrapper ? gnbNavListWrapper.offsetHeight : 0;
      const totalOffset = HEADER_HEIGHT + chipsHeight;

      gnbNav.scrollTo({
        top: getSubmenuTop(targetSubmenu) - totalOffset,
        behavior: "smooth",
      });

      updateActiveNavLink(this);
    }

    function runScrollSpy() {
      if (isDesktop()) return;

      const chipsHeight = gnbNavListWrapper ? gnbNavListWrapper.offsetHeight : 0;
      const offset = HEADER_HEIGHT + chipsHeight + gnbNav.clientHeight * SCROLLSPY_OFFSET_RATIO;
      const scrollPosition = gnbNav.scrollTop;
      const isAtBottom = gnbNav.scrollHeight - gnbNav.scrollTop <= gnbNav.clientHeight + 10;

      let currentSubmenuId = null;

      if (isAtBottom && gnbSubMenus.length) {
        currentSubmenuId = gnbSubMenus[gnbSubMenus.length - 1].id;
      } else {
        gnbSubMenus.forEach((submenu) => {
          if (getSubmenuTop(submenu) <= scrollPosition + offset) {
            currentSubmenuId = submenu.id;
          }
        });
      }

      if (!currentSubmenuId) return;

      const activeLink = gnbContainer.querySelector(
        `.gnb__nav-link[data-menu-target="${currentSubmenuId}"]`
      );

      if (activeLink && !activeLink.classList.contains("active")) {
        updateActiveNavLink(activeLink);
      }
    }

    function initMobileMenu() {
      if (isDesktop()) return;

      gnbNavLinks.forEach((link) => {
        link.removeEventListener("click", handleMobileAnchorClick);
        link.addEventListener("click", handleMobileAnchorClick);
      });

      const firstLink = depth1MenuItems[0]?.querySelector(".gnb__nav-link");
      if (firstLink) updateActiveNavLink(firstLink);
    }

    function closeMenu() {
      gnbNav.classList.remove("is-open");
      gnbNav.classList.remove('is-search');

      if (toggleMenuBtn) {
        toggleMenuBtn.setAttribute("aria-expanded", "false");
        toggleMenuBtn.setAttribute("aria-label", "메뉴 열기");
      }

      document.body.style.overflow = "";

      resetDesktopSubmenus();

      if (gnbNavListWrapper) {
        gnbNavListWrapper.classList.remove("fixed", "is-expanded");
      }
    }

    function openMenu() {
      gnbNav.classList.add("is-open");

      if (toggleMenuBtn) {
        toggleMenuBtn.setAttribute("aria-expanded", "true");
        toggleMenuBtn.setAttribute("aria-label", "메뉴 닫기");
      }

      document.body.style.overflow = "hidden";

      initMobileMenu();

      if (gnbSubMenuFilter) gnbSubMenuFilter.classList.add("active");
      if (gnbMain) gnbMain.classList.add("has-active-submenu");
    }

    function setEqualSubmenuHeight() {
      if (!isDesktop() || !gnbSubMenusContainer) {
        if (gnbSubMenusContainer) gnbSubMenusContainer.style.height = "";
        return;
      }

      const originalDisplay = gnbSubMenusContainer.style.display;
      const originalVisibility = gnbSubMenusContainer.style.visibility;

      gnbSubMenusContainer.style.display = "block";
      gnbSubMenusContainer.style.visibility = "hidden";

      let maxHeight = 0;

      gnbSubMenus.forEach((submenu) => {
        const originalSubmenuDisplay = submenu.style.display;

        submenu.style.display = "flex";
        maxHeight = Math.max(maxHeight, submenu.offsetHeight);
        submenu.style.display = originalSubmenuDisplay;
      });

      gnbSubMenusContainer.style.height = maxHeight ? `${maxHeight}px` : "";

      gnbSubMenusContainer.style.display = originalDisplay;
      gnbSubMenusContainer.style.visibility = originalVisibility;
    }

    hoverContents.forEach((wrapper) => {
      wrapper.addEventListener("mouseenter", () => wrapper.classList.add("active"));
      wrapper.addEventListener("mouseleave", () => wrapper.classList.remove("active"));
    });

    depth1MenuItems.forEach((item) => {
      const navLink = item.querySelector(".gnb__nav-link");
      if (!navLink) return;

      const targetId = navLink.getAttribute("data-menu-target");
      const submenu = targetId ? document.getElementById(targetId) : null;

      navLink.addEventListener("mouseenter", () => {
        if (!isDesktop()) return;

        resetDesktopSubmenus();

        if (!submenu) return;

        if (gnbSubMenusContainer) gnbSubMenusContainer.classList.add("active");
        if (gnbSubMenuFilter) gnbSubMenuFilter.classList.add("active");
        if (gnbMain) gnbMain.classList.add("has-active-submenu");

        submenu.classList.add("active");
        item.classList.add("active");
      });
    });

    gnbNav.addEventListener("scroll", () => {
      handleStickyNav();

      clearTimeout(scrollSpyTimer);
      scrollSpyTimer = setTimeout(runScrollSpy, DEBOUNCE_DELAY);
    });

    if (gnbSubMenuFilter) {
      gnbSubMenuFilter.addEventListener("mouseenter", () => {
        if (isDesktop()) resetDesktopSubmenus();
      });
    }

    if (gnbMain) {
      gnbMain.addEventListener("mouseleave", (e) => {
        if (!isDesktop()) return;

        const toEl = e.relatedTarget;

        if (
          toEl &&
          (gnbMain.contains(toEl) ||
            (gnbSubMenusContainer && gnbSubMenusContainer.contains(toEl)))
        ) {
          return;
        }

        resetDesktopSubmenus();
      });
    }

    gnbContainer.addEventListener("mouseenter", () => {
      isGnbHovered = true;
      gnbContainer.classList.remove("gnb--scrolled");
    });

    gnbContainer.addEventListener("mouseleave", () => {
      isGnbHovered = false;

      if (isDesktop()) resetDesktopSubmenus();

      if (window.scrollY > 60) {
        gnbContainer.classList.add("gnb--scrolled");
      }
    });

    window.addEventListener("scroll", () => {
      const nowScroll = window.scrollY;

      if (!isGnbHovered) {
        if (nowScroll <= 60 || nowScroll < prevScroll) {
          gnbContainer.classList.remove("gnb--scrolled");
        } else if (nowScroll > prevScroll && nowScroll > 60) {
          gnbContainer.classList.add("gnb--scrolled");
        }
      }

      prevScroll = nowScroll;
    });

    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);

      resizeTimer = setTimeout(() => {
        if (isDesktop() && gnbNav.classList.contains("is-open")) {
          closeMenu();
        }

        handleStickyNav();
        setEqualSubmenuHeight();
        updateVisualState();
      }, 100);
    });

    if (toggleMenuBtn) {
      toggleMenuBtn.addEventListener("click", function () {
        const isExpanded = this.getAttribute("aria-expanded") === "true";
        isExpanded ? closeMenu() : openMenu();
      });
    }

    if (closeMenuBtn) {
      closeMenuBtn.addEventListener("click", closeMenu);
    }

    if (gnbNavToggle) {
      gnbNavToggle.addEventListener("click", function (e) {
        e.stopPropagation();

        if (!gnbNavListWrapper) return;

        gnbNavListWrapper.classList.toggle("is-expanded");

        const isExpanded = gnbNavListWrapper.classList.contains("is-expanded");
        this.setAttribute("aria-label", isExpanded ? "메뉴 접기" : "메뉴 전체보기");
      });
    }

    const visualObserver = new MutationObserver(updateVisualState);
    visualObserver.observe(gnbContainer, {
      attributes: true,
      attributeFilter: ["class"],
    });

    setEqualSubmenuHeight();
    updateVisualState();
    initMobileMenu();
  }
})();
(function () {
  function waitForElement(selector, callback) {
    const found = document.querySelector(selector);

    if (found) {
      callback(found);
      return;
    }

    const observer = new MutationObserver(function () {
      const el = document.querySelector(selector);

      if (!el) return;

      observer.disconnect();
      callback(el);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  waitForElement('.search-layer', function (searchLayer) {
    if (searchLayer.dataset.searchInitialized === 'true') return;
    searchLayer.dataset.searchInitialized = 'true';

    function getSearchInput() {
      return searchLayer.querySelector('.input input');
    }

    function getAutocompleteWrap() {
      return searchLayer.querySelector('.search-autocomplete');
    }

    function resetAutocomplete() {
      const autocompleteWrap = getAutocompleteWrap();
      if (!autocompleteWrap) return;

      autocompleteWrap.setAttribute('hidden', '');

      autocompleteWrap.querySelectorAll('.search-autocomplete__item').forEach(function (item) {
        item.hidden = false;
        item.style.display = '';
      });

      searchLayer.classList.remove('is-typing');
    }

    function openSearch() {
      searchLayer.classList.add('is-active');
      document.body.style.overflow = 'hidden';

      // Android WebView에서 초기 IME 연결을 방해할 수 있으므로 제거
      // setTimeout(function () {
      //   getSearchInput()?.focus();
      // }, 50);
    }

    function closeSearch() {
      const searchInput = getSearchInput();

      searchLayer.classList.remove('is-active', 'is-typing');
      document.body.style.overflow = '';

      if (searchInput) searchInput.value = '';

      resetAutocomplete();
    }

    function updateAutocomplete(inputEl) {
      const autocompleteWrap = getAutocompleteWrap();
      if (!autocompleteWrap) return;

      const keyword = inputEl.value.trim().toLowerCase();
      const items = autocompleteWrap.querySelectorAll('.search-autocomplete__item');

      let hasMatch = false;

      if (!keyword) {
        resetAutocomplete();
        return;
      }

      items.forEach(function (item) {
        const text = item.textContent.trim().toLowerCase();
        const isMatched = text.indexOf(keyword) !== -1;

        item.hidden = !isMatched;

        if (isMatched) hasMatch = true;
      });

      if (hasMatch) {
        searchLayer.classList.add('is-typing');
        autocompleteWrap.removeAttribute('hidden');
      } else {
        searchLayer.classList.remove('is-typing');
        autocompleteWrap.setAttribute('hidden', '');
      }
    }


    document.addEventListener('click', function (e) {
      const openBtn = e.target.closest('[data-action="open-search"]');

      if (openBtn) {
        e.preventDefault();
        e.stopImmediatePropagation();
        openSearch();
        return;
      }

      const autocompleteItem = e.target.closest('.search-autocomplete__item');
      if (autocompleteItem && searchLayer.contains(autocompleteItem)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }

      const tagButton = e.target.closest('.search-layer .tag-list .tag');
      if (tagButton) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }

      const rankingItem = e.target.closest('.search-layer .numbering-item');
      if (rankingItem) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }

      if (!searchLayer.classList.contains('is-active')) return;

      const isInside = e.target.closest('.search-layer__inner');
      const isTrigger = e.target.closest('[data-action="open-search"]');

      if (!isInside && !isTrigger) {
        closeSearch();
      }
    });

    document.addEventListener('input', function (e) {
      if (!e.target.matches('.search-layer .input input')) return;

      updateAutocomplete(e.target);
    });

    document.addEventListener('keydown', function (e) {
      if (!e.target.matches('.search-layer .input input')) return;

      if (e.key === 'Escape') {
        closeSearch();
      }
    });
  });
})();

// top-bg 서브페이지 모바일 GNB 스크롤 기반 상태 전환 (checkGnbVisual 패턴)
(function checkTopBgGnb() {
  const topBg = document.querySelector(".page-layout__top-bg");
  if (!topBg) return;

  function applyVisualState(gnb) {
    if (window.innerWidth >= 1024) return;
    gnb.classList.remove('is-top-bg-scrolled');
  }

  function applyScrolledState(gnb) {
    if (window.innerWidth >= 1024) return;
    gnb.classList.add('is-top-bg-scrolled');
  }

  function removeAllOverrides(gnb) {
    gnb.classList.remove('is-top-bg-scrolled');
  }

  function applyByScrollPosition(gnb, titleGroup) {
    if (window.innerWidth >= 1024) return;
    const titleRect = titleGroup.getBoundingClientRect();
    if (titleRect.bottom > 0) {
      applyVisualState(gnb);
    } else {
      applyScrolledState(gnb);
    }
  }

  function initOverride(gnb) {
    const titleGroup = document.querySelector(".title-group.title--display");
    if (!titleGroup) return;

    // 초기 상태 적용
    if (window.innerWidth < 1024) {
      applyByScrollPosition(gnb, titleGroup);
    }

    // include로 로드되는 하위 요소(로고 등) 감지
    const childObserver = new MutationObserver(() => {
      if (window.innerWidth < 1024) {
        applyByScrollPosition(gnb, titleGroup);
      }
      const logoPrimary = gnb.querySelector(".logo__primary");
      const logoLine = gnb.querySelector(".logo__line");
      if (logoPrimary && logoLine) {
        childObserver.disconnect();
      }
    });

    childObserver.observe(gnb, {
      childList: true,
      subtree: true,
    });

    // IntersectionObserver로 title-group 영역 진입/이탈 감지
    const scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (window.innerWidth >= 1024) return;

        if (entry.isIntersecting) {
          applyVisualState(gnb);
        } else {
          applyScrolledState(gnb);
        }
      });
    }, { threshold: 0 });

    scrollObserver.observe(titleGroup);

    // 리사이즈 시 PC↔모바일 전환 처리
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) {
        removeAllOverrides(gnb);
      } else {
        applyByScrollPosition(gnb, titleGroup);
      }
    });
  }

  const gnb = document.querySelector(".gnb");

  if (gnb) {
    initOverride(gnb);
  } else {
    const observer = new MutationObserver(() => {
      const gnb = document.querySelector(".gnb");
      if (gnb) {
        observer.disconnect();
        initOverride(gnb);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
})();


// help tooltip
(() => {
  const TRIGGER_SELECTOR = '[data-js="helpTooltipTrigger"]';
  const CLOSE_SELECTOR = '[data-js="helpTooltipClose"]';

  const MOBILE_BREAKPOINT = 1024;

  let opened = null; // { trigger, popup }
  let lastPointerType = "mouse";

  // -------------------------------
  // Utils
  // -------------------------------
  const isInside = (node, root) => root && root.contains(node);

  const isMobileViewport = () => window.innerWidth < MOBILE_BREAKPOINT;

  const isHoverVariant = (trigger) => {
    const container = trigger.closest(".help-tooltip");
    return !!container && container.classList.contains("help-tooltip--info-icon");
  };

  const getPopup = (trigger) => {
    const container = trigger.closest(".help-tooltip");
    if (!container) return null;
    return container.querySelector(".help-tooltip__popup") || null;
  };

  const resetTooltipShift = (popup) => {
    popup.style.setProperty("--help-tooltip-shift-x", "0px");
  };

  // ✅ left: 0 기반 popup을 모바일에서만 viewport 안으로 "넘친 만큼" 이동
  const adjustTooltipPositionForMobile = (trigger, popup) => {
    if (!popup || !trigger) return;

    // 데스크톱이면 보정 해제
    if (!isMobileViewport()) {
      resetTooltipShift(popup);
      return;
    }

    // 1) 초기화 후 측정
    resetTooltipShift(popup);

    const gutter = 12;
    const minLeft = gutter;
    const maxRight = window.innerWidth - gutter;
  
    const rect = popup.getBoundingClientRect();

    let shiftX = 0;
  
    if (rect.left < minLeft) {
      shiftX += minLeft - rect.left;
    }
  
    if (rect.right + shiftX > maxRight) {
      shiftX -= rect.right + shiftX - maxRight;
    }

    popup.style.setProperty("--help-tooltip-shift-x", `${shiftX}px`);
  };

  // -------------------------------
  // Open / Close / Toggle
  // -------------------------------
  const openTooltip = (trigger, popup) => {
    // 다른 툴팁 열려있으면 닫기
    if (opened && opened.trigger !== trigger) {
      closeTooltip(opened.trigger, opened.popup, { restoreFocus: false });
    }

    trigger.setAttribute("aria-expanded", "true");

    // 먼저 보이지 않는 상태로 렌더링
    popup.style.visibility = "hidden";
    popup.hidden = false;
  
    // 위치 계산 후 노출
    adjustTooltipPositionForMobile(trigger, popup);
  
    requestAnimationFrame(() => {
      popup.style.visibility = "";
    });
  
    opened = { trigger, popup };
  };

  const closeTooltip = (trigger, popup, { restoreFocus = true } = {}) => {
    trigger.setAttribute("aria-expanded", "false");
    popup.hidden = true;
    popup.style.visibility = "";

    // 닫을 때 보정값 초기화(다음 오픈 시 정확히 재계산)
    resetTooltipShift(popup);

    // 닫은 뒤 포커스는 트리거로 복귀 (키보드 UX)
    if (restoreFocus) {
      trigger.focus({ preventScroll: true });
    }

    if (opened && opened.trigger === trigger) opened = null;
  };

  const toggleTooltip = (trigger) => {
    const popup = getPopup(trigger);
    if (!popup) return;

    const expanded = trigger.getAttribute("aria-expanded") === "true";
    if (expanded) closeTooltip(trigger, popup, { restoreFocus: true });
    else openTooltip(trigger, popup);
  };

  // -------------------------------
  // Pointer type tracking
  // -------------------------------
  document.addEventListener("pointerdown", (e) => {
    lastPointerType = e.pointerType || "mouse";
  });

  // -------------------------------
  // Hover variant (mouse only)
  // -------------------------------
  // A) help-tooltip--info-icon: 마우스 오버 시 열기
  document.addEventListener("pointerover", (e) => {
    const trigger = e.target.closest(TRIGGER_SELECTOR);
    if (!trigger) return;
    if (!isHoverVariant(trigger)) return;
    if (e.pointerType && e.pointerType !== "mouse") return;

    const popup = getPopup(trigger);
    if (!popup) return;

    openTooltip(trigger, popup);
  });

  // B) help-tooltip--info-icon: 영역 밖으로 나가면 닫기 (trigger <-> popup 이동은 유지)
  document.addEventListener("pointerout", (e) => {
    if (!opened) return;

    const { trigger, popup } = opened;
    if (!isHoverVariant(trigger)) return;
    if (e.pointerType && e.pointerType !== "mouse") return;

    const container = trigger.closest(".help-tooltip");
    if (!container) return;

    // 이 tooltip 내부에서 발생한 pointerout만 처리
    if (!container.contains(e.target)) return;

    // tooltip 내부(트리거->팝업 등) 이동이면 닫지 않음
    const next = e.relatedTarget;
    if (next && container.contains(next)) return;

    closeTooltip(trigger, popup, { restoreFocus: false });
  });

  // -------------------------------
  // Click handling
  // -------------------------------
  document.addEventListener("click", (e) => {
    // 1) 트리거 클릭
    const trigger = e.target.closest(TRIGGER_SELECTOR);
    if (trigger) {
      e.preventDefault();

      // hover variant는 "마우스 클릭"일 때는 hover로만 동작(깜빡임 방지),
      // 터치/펜은 기존대로 클릭 토글 가능
      if (isHoverVariant(trigger) && lastPointerType === "mouse") return;

      toggleTooltip(trigger);
      return;
    }

    // 2) 닫기 버튼 클릭
    const closeBtn = e.target.closest(CLOSE_SELECTOR);
    if (closeBtn) {
      const popup = closeBtn.closest(".help-tooltip__popup");
      if (!popup) return;

      const container = popup.closest(".help-tooltip");
      const triggerEl = container?.querySelector(TRIGGER_SELECTOR) || null;
      if (triggerEl) closeTooltip(triggerEl, popup, { restoreFocus: true });
      return;
    }

    // 3) 바깥 클릭 시 닫기
    if (opened) {
      const { trigger: openedTrigger, popup } = opened;
      if (!isInside(e.target, openedTrigger) && !isInside(e.target, popup)) {
        closeTooltip(openedTrigger, popup, { restoreFocus: false });
      }
    }
  });

  // -------------------------------
  // Keyboard: ESC to close
  // -------------------------------
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!opened) return;

    closeTooltip(opened.trigger, opened.popup, { restoreFocus: true });
  });

  // -------------------------------
  // Resize / orientation: reflow opened tooltip
  // -------------------------------
  let resizeRaf = null;

  const reflowOpenedTooltip = () => {
    if (!opened) return;
  
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
  
    resizeRaf = requestAnimationFrame(() => {
      const { popup, trigger } = opened;
  
      popup.style.visibility = "hidden";
  
      adjustTooltipPositionForMobile(trigger, popup);
  
      popup.style.visibility = "";
  
      resizeRaf = null;
    });
  };
  
  window.addEventListener("resize", reflowOpenedTooltip);
  window.addEventListener("orientationchange", reflowOpenedTooltip);
})();

/**
 * Universal Marquee (infinite horizontal loop)
 * - supports multiple instances
 * - safe with import.js re-insert (dataset guard)
 */
(() => {
  const WRAPPER_SELECTOR = '[data-marquee]';
  const MOBILE_MQ = window.matchMedia('(max-width: 1023px)');
  const REDUCE_MOTION_MQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  const isMobile = () => MOBILE_MQ.matches;
  const prefersReducedMotion = () => REDUCE_MOTION_MQ.matches;

  function makeClone(node) {
    const clone = node.cloneNode(true);
    clone.setAttribute('data-marquee-clone', '1');
    clone.setAttribute('aria-hidden', 'true');

    // 복제본 내부 포커스 가능한 요소는 탭 이동에서 제외(중복 접근 방지)
    clone
      .querySelectorAll('a, button, input, select, textarea, [tabindex]')
      .forEach((el) => el.setAttribute('tabindex', '-1'));

    return clone;
  }

  function pauseMarquee(wrapper) {
    const trackSelector = wrapper.dataset.track || '.js-marquee-track';
    const track = wrapper.querySelector(trackSelector);
    if (!track) return;

    track.style.animationPlayState = 'paused';
  }

  function resumeMarquee(wrapper) {
    const trackSelector = wrapper.dataset.track || '.js-marquee-track';
    const track = wrapper.querySelector(trackSelector);
    if (!track) return;

    if (prefersReducedMotion()) return;
    if (wrapper.classList.contains('is-marquee-desktop-only') && isMobile()) return;
    if (wrapper.dataset.marqueePausedByPointer === '1') return;
    if (wrapper.dataset.marqueePausedByFocus === '1') return;

    track.style.animationPlayState = 'running';
  }

  function bindMarqueeInteraction(wrapper) {
    if (wrapper.dataset.marqueeInteractionBound === '1') return;
    wrapper.dataset.marqueeInteractionBound = '1';

    const onMouseEnter = () => {
      wrapper.dataset.marqueePausedByPointer = '1';
      pauseMarquee(wrapper);
    };

    const onMouseLeave = () => {
      delete wrapper.dataset.marqueePausedByPointer;
      resumeMarquee(wrapper);
    };

    const onFocusIn = () => {
      wrapper.dataset.marqueePausedByFocus = '1';
      pauseMarquee(wrapper);
    };

    const onFocusOut = () => {
      requestAnimationFrame(() => {
        if (wrapper.contains(document.activeElement)) return;
        delete wrapper.dataset.marqueePausedByFocus;
        resumeMarquee(wrapper);
      });
    };

    wrapper.__marqueeOnMouseEnter = onMouseEnter;
    wrapper.__marqueeOnMouseLeave = onMouseLeave;
    wrapper.__marqueeOnFocusIn = onFocusIn;
    wrapper.__marqueeOnFocusOut = onFocusOut;

    wrapper.addEventListener('mouseenter', onMouseEnter);
    wrapper.addEventListener('mouseleave', onMouseLeave);
    wrapper.addEventListener('focusin', onFocusIn);
    wrapper.addEventListener('focusout', onFocusOut);
  }

  function unbindMarqueeInteraction(wrapper) {
    if (wrapper.__marqueeOnMouseEnter) {
      wrapper.removeEventListener('mouseenter', wrapper.__marqueeOnMouseEnter);
      delete wrapper.__marqueeOnMouseEnter;
    }
    if (wrapper.__marqueeOnMouseLeave) {
      wrapper.removeEventListener('mouseleave', wrapper.__marqueeOnMouseLeave);
      delete wrapper.__marqueeOnMouseLeave;
    }
    if (wrapper.__marqueeOnFocusIn) {
      wrapper.removeEventListener('focusin', wrapper.__marqueeOnFocusIn);
      delete wrapper.__marqueeOnFocusIn;
    }
    if (wrapper.__marqueeOnFocusOut) {
      wrapper.removeEventListener('focusout', wrapper.__marqueeOnFocusOut);
      delete wrapper.__marqueeOnFocusOut;
    }

    delete wrapper.dataset.marqueeInteractionBound;
    delete wrapper.dataset.marqueePausedByPointer;
    delete wrapper.dataset.marqueePausedByFocus;
  }

  function destroyMarquee(wrapper) {
    const trackSelector = wrapper.dataset.track || '.js-marquee-track';
    const track = wrapper.querySelector(trackSelector);
    if (!track) return;

    // ✅ 표식이 있는 복제본만 제거
    track.querySelectorAll('[data-marquee-clone="1"]').forEach((el) => el.remove());

    // ✅ 스타일/플래그 초기화
    track.style.removeProperty('--loop-width');
    track.style.removeProperty('--duration');
    track.style.animation = '';
    track.style.transform = '';
    track.style.animationPlayState = '';

    delete track.dataset.marqueeInit;
    delete wrapper.dataset.marqueeInit;

    unbindMarqueeInteraction(wrapper);
  }

  function initMarquee(wrapper) {
    // ✅ desktop-only인 경우: 모바일에서는 반드시 원복하고 종료
    if (wrapper.classList.contains('is-marquee-desktop-only') && isMobile()) {
      destroyMarquee(wrapper);
      return;
    }

    // wrapper 단위로 중복 초기화 방지
    if (wrapper.dataset.marqueeInit === '1') return;
    wrapper.dataset.marqueeInit = '1';

    const trackSelector = wrapper.dataset.track || '.js-marquee-track';
    const track = wrapper.querySelector(trackSelector);
    if (!track) return;

    // track에도 중복 초기화 방지
    if (track.dataset.marqueeInit === '1') return;
    track.dataset.marqueeInit = '1';

    // ✅ 혹시 이미 복제본이 남아있을 수 있으니 한번 정리(안전)
    track.querySelectorAll('[data-marquee-clone="1"]').forEach((el) => el.remove());

    const originals = Array.from(track.children);
    if (originals.length === 0) return;

    // ✅ 한 세트만 복제(표식 포함)
    originals.forEach((node) => track.appendChild(makeClone(node)));

    const speed = Number(wrapper.dataset.speed || 60);
    const minDuration = Number(wrapper.dataset.minDuration || 8);

    const setLoopWidth = () => {
      // ✅ 측정/재개 시점에도 mobile + desktop-only면 바로 원복
      if (wrapper.classList.contains('is-marquee-desktop-only') && isMobile()) {
        destroyMarquee(wrapper);
        return;
      }

      const prevAnim = track.style.animation;
      const prevPlayState = track.style.animationPlayState;

      track.style.animation = 'none';
      track.getBoundingClientRect(); // reflow

      const first = track.children[0]; // 원본 첫번째
      const firstClone = track.querySelector('[data-marquee-clone="1"]'); // 첫 복제본
      if (!first || !firstClone) return;

      const loopWidth = Math.round(firstClone.offsetLeft - first.offsetLeft);

      track.style.setProperty('--loop-width', loopWidth + 'px');

      const fixedDuration = Number(wrapper.dataset.duration || 0);
      const duration = fixedDuration > 0
        ? fixedDuration
        : Math.max(minDuration, loopWidth / speed);

      track.style.setProperty('--duration', duration + 's');

      track.getBoundingClientRect();
      track.style.animation = prevAnim || '';

      if (prefersReducedMotion()) {
        track.style.animation = 'none';
        track.style.transform = '';
        track.style.animationPlayState = '';
      } else if (
        wrapper.dataset.marqueePausedByPointer === '1' ||
        wrapper.dataset.marqueePausedByFocus === '1'
      ) {
        track.style.animationPlayState = 'paused';
      } else {
        track.style.animationPlayState = prevPlayState || 'running';
      }
    };

    // 이미지/폰트/레이아웃 보정(여러 번)
    setLoopWidth();
    requestAnimationFrame(setLoopWidth);
    setTimeout(setLoopWidth, 200);

    // 폰트 로딩 이후 폭 변경 가능
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => setLoopWidth());
    }

    // 인터랙션 바인딩
    bindMarqueeInteraction(wrapper);

    // 모션 감소 설정이면 애니메이션 정지 상태 유지
    if (prefersReducedMotion()) {
      track.style.animation = 'none';
      track.style.transform = '';
      track.style.animationPlayState = '';
    }

    // 리사이즈 대응(브레이크포인트 전환 포함)
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(setLoopWidth);
    };
    window.addEventListener('resize', onResize, { passive: true });
  }

  // 1) 이미 있는 것들 init
  document.querySelectorAll(WRAPPER_SELECTOR).forEach(initMarquee);

  // 2) 나중에 삽입되는 것들 감지
  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue;

        if (node.matches?.(WRAPPER_SELECTOR)) initMarquee(node);
        node.querySelectorAll?.(WRAPPER_SELECTOR).forEach(initMarquee);
      }
    }
  });

  obs.observe(document.documentElement, { childList: true, subtree: true });

  // ✅ mediaQuery 변화에도 즉시 대응(모바일로 내려가면 원복 / 올라가면 init)
  if (MOBILE_MQ.addEventListener) {
    MOBILE_MQ.addEventListener('change', () => {
      document.querySelectorAll(WRAPPER_SELECTOR).forEach((wrapper) => {
        if (wrapper.classList.contains('is-marquee-desktop-only') && isMobile()) {
          destroyMarquee(wrapper);
        } else {
          initMarquee(wrapper);
        }
      });
    });
  } else if (MOBILE_MQ.addListener) {
    MOBILE_MQ.addListener(() => {
      document.querySelectorAll(WRAPPER_SELECTOR).forEach((wrapper) => {
        if (wrapper.classList.contains('is-marquee-desktop-only') && isMobile()) {
          destroyMarquee(wrapper);
        } else {
          initMarquee(wrapper);
        }
      });
    });
  }

  // ✅ prefers-reduced-motion 변화 대응
  const handleReduceMotionChange = () => {
    document.querySelectorAll(WRAPPER_SELECTOR).forEach((wrapper) => {
      const trackSelector = wrapper.dataset.track || '.js-marquee-track';
      const track = wrapper.querySelector(trackSelector);
      if (!track) return;

      if (prefersReducedMotion()) {
        track.style.animation = 'none';
        track.style.transform = '';
        track.style.animationPlayState = '';
      } else {
        initMarquee(wrapper);
        resumeMarquee(wrapper);
      }
    });
  };

  if (REDUCE_MOTION_MQ.addEventListener) {
    REDUCE_MOTION_MQ.addEventListener('change', handleReduceMotionChange);
  } else if (REDUCE_MOTION_MQ.addListener) {
    REDUCE_MOTION_MQ.addListener(handleReduceMotionChange);
  }

  // 1024 초과
  const FORCE_OPEN_MQ = window.matchMedia('(min-width: 1024px)');
  const FORCE_OPEN_CLASSES = ['accordion--info-card'];

  function isForceOpenType(accordion) {
    return FORCE_OPEN_CLASSES.some((cls) => accordion.classList.contains(cls));
  }

  // 반응형 강제 오픈/복구 처리
  function updateForceOpenResponsiveState(accordion) {
    if (!isForceOpenType(accordion)) return;

    if (FORCE_OPEN_MQ.matches) {
      // 1024 초과: 무조건 열림 유지
      if (accordion.dataset.forceOpenApplied !== 'true') {
        // 강제 오픈 전 상태 저장
        accordion.dataset.forceOpenPrevOpen = accordion.classList.contains('is-open') ? 'true' : 'false';
        accordion.dataset.forceOpenApplied = 'true';
      }
      openAccordion(accordion);
    } else {
      // 1024 이하: 강제 오픈 해제 + 이전 상태로 복구(없으면 닫힘으로)
      if (accordion.dataset.forceOpenApplied === 'true') {
        const prev = accordion.dataset.forceOpenPrevOpen === 'true';
        if (prev) openAccordion(accordion);
        else closeAccordion(accordion);

        delete accordion.dataset.forceOpenApplied;
        delete accordion.dataset.forceOpenPrevOpen;
      }
    }
  }

  // 아코디언 메뉴 - 시야에서 안 보일 시 닫히는 기능은 주석 처리
  function toggleAccordion(accordion) {
    // PC에서 accordion--info-card는 항상 열림 유지
    if (isForceOpenType(accordion) && FORCE_OPEN_MQ.matches) {
      openAccordion(accordion);
      return;
    }

    const group = accordion.parentElement.closest('[data-accordion="only-one"]');
    const isOpen = accordion.classList.contains('is-open');

    // ✅ only-one이면 닫기 금지
    if (group && isOpen) {
      return;
    }

    if (isOpen) {
      closeAccordion(accordion);
    } else {
      if (group) {
        group.querySelectorAll('[data-js="accordion"].is-open').forEach(function (sibling) {
          if (sibling !== accordion) closeAccordion(sibling);
        });
      }
      openAccordion(accordion);
    }
  }
  

  function openAccordion(accordion) {
    const button = accordion.querySelector('.accordion__button');
    const content = accordion.querySelector('.accordion__content');

    accordion.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
    content.setAttribute('aria-hidden', 'false');
  }

  function closeAccordion(accordion) {
    const button = accordion.querySelector('.accordion__button');
    const content = accordion.querySelector('.accordion__content');

    accordion.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    content.setAttribute('aria-hidden', 'true');
  }

  function initAccordion(accordion) {
    if (accordion.dataset.accordionInited) return;
    accordion.dataset.accordionInited = 'true';

    const button = accordion.querySelector('.accordion__button');
    const content = accordion.querySelector('.accordion__content');

    if (!button || !content) return;

    const triggerCheckbox = accordion.querySelector('.accordion-trigger-checkbox');
    button.addEventListener('click', function (e) {
      if (triggerCheckbox && (e.target === triggerCheckbox || e.target.closest('.accordion-trigger-checkbox__label'))) {
        return;
      }
      toggleAccordion(accordion);
      if (triggerCheckbox) {
        triggerCheckbox.checked = accordion.classList.contains('is-open');
      }
    });

    if (triggerCheckbox) {
      triggerCheckbox.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleAccordion(accordion);
        const isOpen = accordion.classList.contains('is-open');
        this.checked = isOpen;
        if (isOpen) this.setAttribute('checked', 'checked');
        else this.removeAttribute('checked');
      });

      if (accordion.classList.contains('is-open')) {
        triggerCheckbox.checked = true;
        triggerCheckbox.setAttribute('checked', 'checked');
      }
    }

    // init 시점에 반응형 상태 반영
    updateForceOpenResponsiveState(accordion);

    // 탭(아코디언) 화면 이탈 시 닫기 기능 비활성화
    // const observer = new IntersectionObserver(
    //   (entries) => {
    //     entries.forEach(entry => {
    //       if (!entry.isIntersecting && entry.intersectionRatio === 0) {
    //         if (accordion.classList.contains('is-open')) {
    //           closeAccordion(accordion);
    //         }
    //       }
    //     });
    //   },
    //   { rootMargin: '0px', threshold: 0 }
    // );
    // observer.observe(accordion);
  }

  function initAccordions() {
    document.querySelectorAll('[data-js="accordion"]').forEach(initAccordion);

    // breakpoint 변경 시 info-card 강제 오픈/복구
    const onChange = () => {
      document.querySelectorAll('[data-js="accordion"]').forEach(updateForceOpenResponsiveState);
    };

    // matchMedia change 이벤트 (구형 사파리 대응 포함)
    if (FORCE_OPEN_MQ.addEventListener) FORCE_OPEN_MQ.addEventListener('change', onChange);
    else FORCE_OPEN_MQ.addListener(onChange);
    
    document.querySelectorAll('[data-accordion="only-one"]').forEach(function (group) {
      const openItem = group.querySelector('[data-js="accordion"].is-open');
      if (!openItem) {
        const first = group.querySelector('[data-js="accordion"]');
        if (first) openAccordion(first);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccordions);
  } else {
    initAccordions();
  }

  // data-include로 동적 로드된 아코디언 초기화
  setTimeout(initAccordions, 300);
  const mo = new MutationObserver(() => initAccordions());
  mo.observe(document.body, { childList: true, subtree: true });
})();

// Breadcrumb
(function initBreadcrumbGroup() {
  const root = document.querySelector(".breadcrumb-group");
  if (!root) return;

  function getActiveItems() {
    return Array.from(root.querySelectorAll(".breadcrumb-group__item.is-active"));
  }

  function closeAll(exceptItem) {
    getActiveItems().forEach((item) => {
      if (exceptItem && item === exceptItem) return;

      item.classList.remove("is-active");

      const depthBtn = item.querySelector(".breadcrumb-group__depth");
      if (depthBtn) depthBtn.setAttribute("aria-expanded", "false");
    });
  }

  function toggleItem(item) {
    const depthBtn = item.querySelector(".breadcrumb-group__depth");
    const menu = item.querySelector(".breadcrumb-group__menu");

    // home(메뉴 없음) or 메뉴 없는 depth면: 열린 거 닫기만
    if (!depthBtn || !menu) {
      closeAll();
      return;
    }

    const willOpen = !item.classList.contains("is-active");

    // 하나만 열리게
    closeAll(item);

    item.classList.toggle("is-active", willOpen);
    depthBtn.setAttribute("aria-expanded", String(willOpen));
  }

  // aria-expanded 초기값
  root.querySelectorAll(".breadcrumb-group__depth").forEach((btn) => {
    if (!btn.hasAttribute("aria-expanded")) btn.setAttribute("aria-expanded", "false");
  });

  // 클릭 이벤트 (위임)
  document.addEventListener("click", (e) => {
    // 메뉴 내부 클릭이면 유지
    if (e.target.closest(".breadcrumb-group__menu")) return;

    // breadcrumb item 클릭이면 해당 item 토글
    const item = e.target.closest(".breadcrumb-group__item");
    if (item && root.contains(item)) {
      toggleItem(item);
      return;
    }

    // 그 외 화면 클릭이면 닫기
    closeAll();
  });

  // ESC 닫기
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });
})();

(function () {
  // =========================
  // ECharts: 탭 전환 시 리사이즈 보강
  // =========================
  function resizeChartsIn(container) {
    if (!container) return;
    if (typeof echarts === "undefined") return;

    const chartEls = container.querySelectorAll(".chart_cont");
    chartEls.forEach((el) => {
      const inst = echarts.getInstanceByDom(el);
      if (inst) inst.resize();
    });
  }

  function forceResizeChartsIn(container) {
    // hidden -> show 직후 레이아웃 반영 타이밍 이슈 대응
    requestAnimationFrame(() => {
      resizeChartsIn(container);

      requestAnimationFrame(() => {
        resizeChartsIn(container);

        // 폰트/레이아웃이 늦게 반영되는 케이스 보강
        setTimeout(() => resizeChartsIn(container), 30);
      });
    });
  }

  // =========================
  // Tabs
  // =========================
  function initTabs() {
    const tabsContainers = document.querySelectorAll('[data-js="tabs"]');
    if (!tabsContainers.length) return;

    tabsContainers.forEach((tabsContainer) => {
      if (tabsContainer.dataset.tabsInited) return;
      tabsContainer.dataset.tabsInited = "true";

      const tabButtons = tabsContainer.querySelectorAll('[data-action="tab"]');

      function switchTab(clickedTab) {
        const panelId = clickedTab.getAttribute("aria-controls");
        if (!panelId) return;

        const targetPanel = document.getElementById(panelId);
        if (!targetPanel) return;

        // 같은 tabsContainer에 속한 패널만 수집
        const relatedPanels = Array.from(tabButtons)
          .map((tab) => document.getElementById(tab.getAttribute("aria-controls")))
          .filter(Boolean);

        // 탭 비활성화
        tabButtons.forEach((tab) => {
          tab.classList.remove("is-active");
          tab.setAttribute("aria-selected", "false");
          tab.setAttribute("tabindex", "-1");
        });

        // 패널 숨김
        relatedPanels.forEach((panel) => {
          panel.classList.remove("is-active");
          panel.setAttribute("hidden", "");
        });

        // 클릭한 탭 활성화
        clickedTab.classList.add("is-active");
        clickedTab.setAttribute("aria-selected", "true");
        clickedTab.setAttribute("tabindex", "0");

        // 해당 패널 표시
        targetPanel.classList.add("is-active");
        targetPanel.removeAttribute("hidden");

        // ✅ 탭 활성화 직후 ECharts 리사이즈(가장 중요)
        forceResizeChartsIn(targetPanel);
        
        // 해당 패널 표시
        targetPanel.classList.add("is-active");
        targetPanel.removeAttribute("hidden");

        // ✅ 탭 활성화 직후 ECharts 리사이즈
        forceResizeChartsIn(targetPanel);

        // ✅ 탭 활성화 직후 테이블 스크롤 힌트 체크
        requestAnimationFrame(() => {
          updateVisibleTableScrollHints(targetPanel);
        });
      }

      // 클릭 이벤트
      tabButtons.forEach((tab) => {
        tab.addEventListener("click", function () {
          switchTab(this);
        });
      });

      // 키보드 네비게이션
      tabsContainer.addEventListener("keydown", function (e) {
        const currentTab = document.activeElement;
        if (!currentTab || !currentTab.hasAttribute("data-action")) return;

        const tabsArray = Array.from(tabButtons);
        const currentIndex = tabsArray.indexOf(currentTab);
        let nextIndex = -1;

        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : tabsArray.length - 1;
          e.preventDefault();
        } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          nextIndex = currentIndex < tabsArray.length - 1 ? currentIndex + 1 : 0;
          e.preventDefault();
        } else if (e.key === "Home") {
          nextIndex = 0;
          e.preventDefault();
        } else if (e.key === "End") {
          nextIndex = tabsArray.length - 1;
          e.preventDefault();
        }

        if (nextIndex !== -1) {
          switchTab(tabsArray[nextIndex]);
          tabsArray[nextIndex].focus();
        }
      });

      // ✅ 초기 활성 탭(처음부터 보이는 패널)도 한 번 보강 리사이즈
      const initiallyActiveTab =
        tabsContainer.querySelector('[data-action="tab"].is-active') ||
        tabsContainer.querySelector('[data-action="tab"][aria-selected="true"]') ||
        tabButtons[0];

      if (initiallyActiveTab) {
        const initialPanelId = initiallyActiveTab.getAttribute("aria-controls");
        const initialPanel = initialPanelId && document.getElementById(initialPanelId);
        if (initialPanel && !initialPanel.hasAttribute("hidden")) {
          forceResizeChartsIn(initialPanel);
        }
      }
    });
  }

  initTabs();

  // data-include로 동적 로드된 탭 초기화
  setTimeout(initTabs, 500);
})();


// chart - donut
(function initDonuts() {
  document.querySelectorAll(".donut").forEach((el) => {
    const values = (el.dataset.values || "")
      .split(",")
      .map(v => Number(v.trim()))
      .filter(v => v > 0);

    const colors = (el.dataset.colors || "")
      .split(",")
      .map(c => c.trim());

    if (!values.length) return;

    const total = values.reduce((a, b) => a + b, 0);

    let acc = 0;
    const stops = values.map((v, i) => {
      const start = (acc / total) * 360;
      acc += v;
      const end = (acc / total) * 360;

      // 👉 var(--token) 그대로 사용
      const color = colors[i] || "transparent";
      return `${color} ${start}deg ${end}deg`;
    });

    el.style.setProperty(
      "--bg",
      `conic-gradient(${stops.join(",")})`
    );
  });
})();

// custom select
(() => {
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const GAP = 4;
  const MAX_HEIGHT = 200;
  const CLOSE_SCROLL_DISTANCE = 150;

  let opened = null; // { trigger, dropdown }
  let openedScrollState = null; // { target, startTop }

  const getDropdown = (trigger) =>
    trigger.nextElementSibling?.classList.contains("select-dropdown")
      ? trigger.nextElementSibling
      : null;

  const getSelect = (trigger) => {
    const el = trigger.previousElementSibling;
    return el?.tagName === "SELECT" ? el : null;
  };

  const isInPopup = (trigger) => {
    return !!trigger.closest(".modal, .popup, .dialog, [role='dialog']");
  };

  const getScrollParent = (el) => {
    let p = el?.parentElement;

    while (p && p !== document.body) {
      const cs = getComputedStyle(p);
      const overflowY = cs.overflowY;

      if (
        (overflowY === "auto" || overflowY === "scroll") &&
        p.scrollHeight > p.clientHeight
      ) {
        return p;
      }

      p = p.parentElement;
    }

    return window;
  };

  const getScrollTop = (el) => {
    return el === window
      ? window.scrollY || window.pageYOffset
      : el.scrollTop;
  };

  const ensureSelectWrapperPosition = (trigger) => {
    const wrapper = trigger.parentElement;
    if (wrapper) wrapper.style.position = "relative";
  };

  const syncSelectToUI = (select, trigger, dropdown) => {
    const valueEl = trigger?.querySelector(".select-value");
    const selectedOption = select.options[select.selectedIndex];
    const label = selectedOption ? selectedOption.textContent.trim() : "";

    if (valueEl) valueEl.textContent = label;

    dropdown?.querySelectorAll(".select-option").forEach((opt, i) => {
      const isSelected = select.options[i] && select.selectedIndex === i;
      opt.classList.toggle("is-selected", !!isSelected);
      opt.setAttribute("aria-selected", isSelected ? "true" : "false");
    });

    if (select?.options) {
      for (let i = 0; i < select.options.length; i++) {
        select.options[i].classList.toggle("is-selected", select.selectedIndex === i);
      }
    }

    trigger?.setAttribute("aria-expanded", "false");
  };

  const buildDropdownFromSelect = (select, dropdown) => {
    dropdown.innerHTML = "";

    for (let i = 0; i < select.options.length; i++) {
      const opt = select.options[i];
      const div = document.createElement("div");

      div.className = "select-option";
      div.setAttribute("role", "option");
      div.setAttribute("data-value", opt.value);
      div.setAttribute("aria-selected", select.selectedIndex === i ? "true" : "false");

      if (select.selectedIndex === i) div.classList.add("is-selected");

      div.textContent = opt.textContent.trim();
      dropdown.appendChild(div);
    }
  };

  const ensureSelectFromDropdown = (trigger, dropdown) => {
    const existing = getSelect(trigger);
    if (existing) return existing;

    const options = dropdown.querySelectorAll(".select-option");
    const select = document.createElement("select");

    select.className = "custom-select__native";
    select.setAttribute("aria-hidden", "true");
    select.setAttribute("tabindex", "-1");

    options.forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt.dataset.value ?? opt.textContent.trim();
      o.textContent = opt.textContent.trim();

      if (opt.classList.contains("is-selected")) o.selected = true;

      select.appendChild(o);
    });

    trigger.parentElement.insertBefore(select, trigger);

    return select;
  };

  const rafThrottle = (fn) => {
    let raf = 0;

    return (...args) => {
      if (raf) cancelAnimationFrame(raf);

      raf = requestAnimationFrame(() => {
        raf = 0;
        fn(...args);
      });
    };
  };

  const inRect = (e, r) =>
    e.clientX >= r.left &&
    e.clientX <= r.right &&
    e.clientY >= r.top &&
    e.clientY <= r.bottom;

  const findFixedContainingBlock = (el) => {
    let p = el.parentElement;

    while (p) {
      const cs = getComputedStyle(p);

      const hasTransform = cs.transform && cs.transform !== "none";
      const hasFilter = cs.filter && cs.filter !== "none";
      const hasPerspective = cs.perspective && cs.perspective !== "none";
      const willChange = cs.willChange || "";
      const hasWillChange = /transform|filter|perspective/.test(willChange);

      if (hasTransform || hasFilter || hasPerspective || hasWillChange) return p;

      p = p.parentElement;
    }

    return null;
  };

  const getAnchorRect = (trigger) => {
    const select = getSelect(trigger);

    if (select) {
      const r = select.getBoundingClientRect();
      if (r.width >= 1 && r.height >= 1) return r;
    }

    const tr = trigger.getBoundingClientRect();
    if (tr.width >= 1 && tr.height >= 1) return tr;

    const wrapper = trigger.parentElement;
    if (wrapper) return wrapper.getBoundingClientRect();

    return tr;
  };

  const resetDropdownInlineStyle = (dropdown) => {
    if (!dropdown) return;

    dropdown.style.display = "";
    dropdown.style.position = "";
    dropdown.style.top = "";
    dropdown.style.left = "";
    dropdown.style.right = "";
    dropdown.style.width = "";
    dropdown.style.minWidth = "";
    dropdown.style.margin = "";
    dropdown.style.zIndex = "";
    dropdown.style.maxHeight = "";
  };

  const applyNormalPosition = (trigger, dropdown) => {
    if (!trigger || !dropdown || dropdown.hidden) return;

    dropdown.style.position = "absolute";
    dropdown.style.top = `calc(100% + ${GAP}px)`;
    dropdown.style.left = "0";
    dropdown.style.right = "auto";
    dropdown.style.width = "100%";
    dropdown.style.minWidth = "";
    dropdown.style.margin = "0";
    dropdown.style.zIndex = "100";
    dropdown.style.maxHeight = `${MAX_HEIGHT}px`;
  };

  const applyFixedPosition = (trigger, dropdown) => {
    if (!trigger || !dropdown || dropdown.hidden) return;

    dropdown.style.position = "fixed";
    dropdown.style.right = "auto";
    dropdown.style.margin = "0";
    dropdown.style.zIndex = "9999";

    const rect = getAnchorRect(trigger);
    const isSearchCombo = !!trigger.closest(".search-dropdown-input");
    const widthRect = isSearchCombo ? trigger.getBoundingClientRect() : rect;

    const base = findFixedContainingBlock(dropdown);
    const baseRect = base
      ? base.getBoundingClientRect()
      : {
          left: 0,
          top: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };

    const vw = baseRect.width;
    const vh = baseRect.height;

    const relLeft = rect.left - baseRect.left;
    const relTop = rect.top - baseRect.top;
    const relBottom = rect.bottom - baseRect.top;

    const belowSpace = vh - relBottom - GAP;
    const aboveSpace = relTop - GAP;

    let openUp = belowSpace < 160 && aboveSpace > belowSpace;

    dropdown.style.width = `${Math.round(widthRect.width)}px`;
    dropdown.style.minWidth = "";

    const measuredWidth = dropdown.getBoundingClientRect().width || widthRect.width;
    let left = relLeft;

    const overflowRight = left + measuredWidth - vw;
    if (overflowRight > 0) left = Math.max(0, left - overflowRight);
    if (left < 0) left = 0;

    dropdown.style.left = `${Math.round(left)}px`;

    let maxH = Math.min(
      MAX_HEIGHT,
      Math.max(0, Math.floor(openUp ? aboveSpace : belowSpace)) || MAX_HEIGHT
    );

    dropdown.style.maxHeight = `${maxH}px`;

    let desiredHeight = Math.min(dropdown.scrollHeight, maxH);
    let top = openUp ? relTop - GAP - desiredHeight : relBottom + GAP;

    let maxTop = vh - desiredHeight - GAP;
    top = Math.min(Math.max(GAP, top), Math.max(GAP, maxTop));

    if (!openUp && top < relBottom + GAP) {
      openUp = true;

      maxH = Math.min(
        MAX_HEIGHT,
        Math.max(0, Math.floor(aboveSpace)) || MAX_HEIGHT
      );

      dropdown.style.maxHeight = `${maxH}px`;

      desiredHeight = Math.min(dropdown.scrollHeight, maxH);
      top = relTop - GAP - desiredHeight;

      maxTop = vh - desiredHeight - GAP;
      top = Math.min(Math.max(GAP, top), Math.max(GAP, maxTop));
    }

    dropdown.style.top = `${Math.round(top)}px`;
  };

  const applyDropdownPosition = (trigger, dropdown) => {
    if (isInPopup(trigger)) {
      applyFixedPosition(trigger, dropdown);
    } else {
      applyNormalPosition(trigger, dropdown);
    }
  };

  const updateOpenedPosition = rafThrottle(() => {
    if (!opened) return;

    if (openedScrollState) {
      const currentTop = getScrollTop(openedScrollState.target);
      const diff = Math.abs(currentTop - openedScrollState.startTop);

      if (diff >= CLOSE_SCROLL_DISTANCE) {
        closeAll();
        return;
      }
    }

    if (!isInPopup(opened.trigger)) return;

    applyFixedPosition(opened.trigger, opened.dropdown);
  });

  const closeAll = () => {
    $$(".select-trigger.is-open").forEach((t) => {
      t.classList.remove("is-open");
      t.setAttribute("aria-expanded", "false");

      const d = getDropdown(t);

      if (d) {
        d.hidden = true;
        resetDropdownInlineStyle(d);
      }
    });

    opened = null;
    openedScrollState = null;
  };

  document.addEventListener("customSelect:closeAll", closeAll);

  const initCustomSelect = (trigger) => {
    const dropdown = getDropdown(trigger);
    if (!dropdown) return;

    ensureSelectWrapperPosition(trigger);

    let select = trigger.previousElementSibling?.classList?.contains("custom-select__native")
      ? trigger.previousElementSibling
      : null;

    if (select) {
      select.classList.add("custom-select__native");
      select.setAttribute("aria-hidden", "true");
      select.setAttribute("tabindex", "-1");
      buildDropdownFromSelect(select, dropdown);
    } else {
      select = ensureSelectFromDropdown(trigger, dropdown);
    }

    syncSelectToUI(select, trigger, dropdown);

    if (select.disabled) {
      trigger.classList.add("is-disabled");
      trigger.setAttribute("aria-disabled", "true");
    }

    if (!select.__customSelectBound) {
      select.addEventListener("change", () => syncSelectToUI(select, trigger, dropdown));
      select.__customSelectBound = true;
    }

    dropdown.hidden = true;
  };

  $$(".select-trigger").forEach(initCustomSelect);

  document.addEventListener("click", (e) => {
    const combo = e.target.closest(".search-dropdown-input");

    if (combo) {
      const useEl = combo.querySelector(
        'use[href="#icon-search"], use[xlink\\:href="#icon-search"]'
      );
      const searchSvg = useEl?.closest("svg");

      if (searchSvg) {
        const r = searchSvg.getBoundingClientRect();

        const inSearchIcon =
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom;

        if (inSearchIcon) {
          closeAll();
          return;
        }
      }
    }

    const trigger = e.target.closest(".select-trigger");
    const option = e.target.closest(".select-option");

    if (option) {
      const dropdown = option.closest(".select-dropdown");
      const t = dropdown?.previousElementSibling?.classList.contains("select-trigger")
        ? dropdown.previousElementSibling
        : null;

      if (!t) return;

      const select = getSelect(t);
      if (select?.disabled) return;

      const optionIndex = [...dropdown.querySelectorAll(".select-option")].indexOf(option);

      if (select) {
        select.selectedIndex = optionIndex >= 0 ? optionIndex : 0;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }

      syncSelectToUI(select, t, dropdown);

      t.classList.remove("is-open");
      t.setAttribute("aria-expanded", "false");

      dropdown.hidden = true;
      resetDropdownInlineStyle(dropdown);

      opened = null;
      openedScrollState = null;
      return;
    }

    if (trigger) {
      const combo = trigger.closest(".search-dropdown-input");

      if (combo) {
        const comboInput = combo.querySelector('input[type="text"]');
        const iconUse = combo.querySelector(
          'use[href="#icon-search"], use[xlink\\:href="#icon-search"]'
        );
        const searchIcon = iconUse?.closest("svg");

        if (comboInput && inRect(e, comboInput.getBoundingClientRect())) {
          closeAll();
          return;
        }

        if (searchIcon && inRect(e, searchIcon.getBoundingClientRect())) {
          closeAll();
          return;
        }

        if (!inRect(e, trigger.getBoundingClientRect())) return;
      }

      const select = getSelect(trigger);
      if (select?.disabled) return;

      const dropdown = getDropdown(trigger);
      if (!dropdown) return;

      const willOpen = !trigger.classList.contains("is-open");

      closeAll();

      trigger.classList.toggle("is-open", willOpen);
      trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");

      dropdown.hidden = !willOpen;

      if (willOpen) {
        dropdown.style.display = "block";

        const scrollTarget = isInPopup(trigger) ? getScrollParent(trigger) : window;

        opened = { trigger, dropdown };
        openedScrollState = {
          target: scrollTarget,
          startTop: getScrollTop(scrollTarget),
        };

        applyDropdownPosition(trigger, dropdown);
        requestAnimationFrame(() => applyDropdownPosition(trigger, dropdown));
      } else {
        resetDropdownInlineStyle(dropdown);
        opened = null;
        openedScrollState = null;
      }

      return;
    }

    closeAll();

    const accordionCardBtn = e.target.closest(".accordion-card__button");
    if (!accordionCardBtn) return;

    const accordionCard = accordionCardBtn.closest(".accordion-card");
    if (!accordionCard) return;

    const isOpen = accordionCard.classList.toggle("is-open");

    const triggerTextEl = accordionCardBtn.querySelector(".accordion-card__btn-text");
    if (triggerTextEl) {
      triggerTextEl.textContent = isOpen ? "접기" : "상세보기";
    }

    accordionCardBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  document.addEventListener("scroll", updateOpenedPosition, true);
  window.addEventListener("resize", updateOpenedPosition);
  window.addEventListener("orientationchange", updateOpenedPosition);

  if (window.visualViewport) {
    window.visualViewport.addEventListener("scroll", updateOpenedPosition);
    window.visualViewport.addEventListener("resize", updateOpenedPosition);
  }

  const selectObs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue;

        const triggers = node.matches?.(".select-trigger")
          ? [node]
          : [...(node.querySelectorAll?.(".select-trigger") ?? [])];

        triggers.forEach(initCustomSelect);
      }
    }
  });

  selectObs.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();

/**
 * createBarChartOption (ECharts)
 * - 공통 스타일(라벨 pill, dashed grid, radius bar) 유지
 * - 테마(light/dark) 팔레트 적용
 * - 듀얼축(yAxis 배열) 지원 + 시리즈별 yAxisIndex
 * - 듀얼축일 때 bar 간격 기본 확대
 * - 모바일: xAxis는 유지, yAxis(라벨/축선/틱)만 숨김 + 점선(splitLine)은 유지
 * - 모바일: yAxis 공간만큼 grid 좌/우 여백 축소
 */
function createBarChartOption({
  // Data
  xAxisData = [],
  seriesData = [],

  // Layout
  grid = { left: 0, right: 0, bottom: 0, top: 40 },
  mobileGrid = { left: 0, right: 0 },

  // Theme
  theme = "light", // 'light' | 'dark'
  palette = {},

  // Axis
  yAxis = null, // null | object | [object, object]
  yAxisPosition = "left",

  // Responsive
  isMobile = false,
  hideYAxisOnMobile = true, // 모바일에서 yAxis(라벨/선/틱) 숨기되 splitLine은 유지

  // Bar style
  barMaxWidth = 36,
  barMinWidth = 30,
  radiusTop = 50,

  // Gap (override 가능)
  barGap,
  barCategoryGap,

  // Label style (override 가능)
  labelStyle = {
    show: true,
    position: "top",
    padding: [3, 6, 1, 6],
    borderWidth: 1,
    borderRadius: 6,
    shadowBlur: 12,
    shadowOffsetY: 5,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 18,
    align: "center",
  },

  // Grid line style (override 가능)
  splitLine = {
    x: { color: "rgba(0, 0, 26, 0.15)", type: "dashed", width: 1 },
    y: { color: "rgba(0, 0, 26, 0.15)", type: "dashed", width: 1 },
  },
}) {
  // -------------------------
  // Theme palette
  // -------------------------
  const DEFAULT_PALETTE = {
    light: {
      barBase: "#646D78",
      highlight: "#FFDD00",
      labelBg: "#F1F2F4",
      labelBorder: "#CDD0D6",
      labelText: "#111111",
      gridLineX: "rgba(0, 0, 26, 0.15)",
      gridLineY: "rgba(0, 0, 26, 0.15)",
      axisText: "#848E9A",
      shadow: "rgba(0, 0, 0, 0.05)",
    },
    dark: {
      barBase: "#353535",
      highlight: "#FFDD00",
      labelBg: "#525252",
      labelBorder: "#5C5C5C",
      labelText: "#FAFAFA",
      gridLineX: "rgba(0, 0, 26, 0.15)",
      gridLineY: "rgba(0, 0, 26, 0.15)",
      axisText: "#9E9E9E",
      shadow: "rgba(0, 0, 0, 0.05)",
    },
  };

  const P = {
    ...DEFAULT_PALETTE[theme],
    ...palette,
  };

  // 듀얼축 여부
  const isDualAxis = Array.isArray(yAxis) && yAxis.length >= 2;

  // 듀얼축일 때 기본 간격 넓히기 (override 가능)
  const finalBarGap = barGap ?? (isDualAxis ? "80%" : "30%");
  const finalBarCategoryGap = barCategoryGap ?? (isDualAxis ? "55%" : "40%");

  // 모바일일 때 grid left/right 줄이기
  const finalGrid = {
    ...grid,
    ...(isMobile ? mobileGrid : null),
    containLabel: true, // ✅ 라벨 잘림 방지(핵심)
  };

  // -------------------------
  // 1) series 표준화 + 기본 스타일 주입
  // -------------------------
  const series = seriesData.map((s) => ({
    type: "bar",
    name: s.name ?? "",
    // stack은 직접 준 경우에만 적용(기본은 나란히)
    stack: s.stack ?? undefined,
    yAxisIndex: s.yAxisIndex ?? 0,
    barMaxWidth: s.barMaxWidth ?? barMaxWidth,
    barMinWidth: s.barMinWidth ?? barMinWidth,
    itemStyle: { color: s.baseColor ?? P.barBase },
    data: (s.data ?? []).map((v, idx) => {
      // highlight 지원
      const hi = s.highlight;
      if (typeof v === "number" && hi && idx === hi.index) {
        return { value: v, itemStyle: { color: hi.color ?? P.highlight } };
      }
      return v;
    }),
  }));

  // -------------------------
  // 2) stackInfo 계산 (stack이 있을 때만 의미)
  // -------------------------
  const stackInfo = {};
  const len = series[0]?.data?.length ?? 0;

  for (let i = 0; i < len; i++) {
    for (let j = 0; j < series.length; j++) {
      const stackName = series[j].stack;
      if (!stackName) continue;

      if (!stackInfo[stackName]) stackInfo[stackName] = { stackStart: [], stackEnd: [] };

      const info = stackInfo[stackName];
      const d = series[j].data[i];

      const value = d && typeof d === "object" && d.value !== undefined ? d.value : d;
      const valid = value !== "-" && value !== null && value !== undefined && value !== 0 ? true : value === 0;

      if (valid) {
        if (info.stackStart[i] == null) info.stackStart[i] = j;
        info.stackEnd[i] = j;
      }
    }
  }

  // -------------------------
  // 3) borderRadius 병합
  // - stack 없으면: 항상 상단 라운드
  // - stack 있으면: stack의 마지막만 상단 라운드
  // -------------------------
  for (let i = 0; i < series.length; i++) {
    const data = series[i].data;
    const info = series[i].stack ? stackInfo[series[i].stack] : null;

    for (let j = 0; j < data.length; j++) {
      const raw = data[j];
      const value = raw && typeof raw === "object" && raw.value !== undefined ? raw.value : raw;

      const isEnd = info ? info?.stackEnd?.[j] === i : true;
      const top = isEnd ? radiusTop : 0;

      const prevObj = raw && typeof raw === "object" ? raw : {};
      const prevItemStyle = prevObj.itemStyle ?? {};

      data[j] = {
        ...prevObj,
        value,
        itemStyle: {
          ...prevItemStyle,
          borderRadius: [top, top, 0, 0],
        },
      };
    }
  }

  // -------------------------
  // 4) yAxis 구성
  // -------------------------
  const finalYAxis = yAxis
    ? Array.isArray(yAxis)
      ? yAxis
      : [yAxis]
    : [
        {
          type: "value",
          position: yAxisPosition,
        },
      ];

  // 모바일에서 yAxis 숨김 여부 (단, splitLine은 유지)
  const hideYAxis = isMobile && hideYAxisOnMobile;

  const yAxisStyled = finalYAxis.map((axis, idx) => {
    // axisLabel 기본 병합
    const mergedAxisLabel = {
      color: P.axisText,
      ...(axis.axisLabel || {}),
    };

    // splitLine 기본: 첫번째 축은 보이게, 두번째는 기본 숨김 (원하면 axis에서 override 가능)
    const baseSplitLine =
      idx === 0
        ? {
            show: true,
            lineStyle: {
              color: P.gridLineY,
              type: splitLine?.y?.type ?? "dashed",
              width: splitLine?.y?.width ?? 1,
            },
          }
        : {
            show: false,
            lineStyle: {
              color: P.gridLineY,
              type: splitLine?.y?.type ?? "dashed",
              width: splitLine?.y?.width ?? 1,
            },
          };

    // axis.splitLine가 있으면 병합하되, color는 테마로 최종 강제
    const mergedSplitLine = axis.splitLine
      ? {
          ...baseSplitLine,
          ...axis.splitLine,
          lineStyle: {
            ...(baseSplitLine.lineStyle || {}),
            ...((axis.splitLine && axis.splitLine.lineStyle) || {}),
            color: P.gridLineY,
          },
        }
      : baseSplitLine;

    // axisLine(축 자체 선): 기본 숨김, show:true 주면 컬러만 테마로 강제
    const baseAxisLine = { show: false, lineStyle: { color: P.gridLineY, width: 1 } };
    const mergedAxisLine = axis.axisLine
      ? {
          ...baseAxisLine,
          ...axis.axisLine,
          lineStyle: {
            ...(baseAxisLine.lineStyle || {}),
            ...((axis.axisLine && axis.axisLine.lineStyle) || {}),
            color: P.gridLineY,
          },
        }
      : baseAxisLine;

    return {
      ...axis,
      axisLabel: hideYAxis ? { ...mergedAxisLabel, show: false } : mergedAxisLabel,
      axisLine: hideYAxis ? { ...mergedAxisLine, show: false } : mergedAxisLine,
      axisTick: hideYAxis ? { show: false } : axis.axisTick ?? { show: false },

      // ✅ 모바일에서도 배경 점선은 유지
      splitLine: mergedSplitLine,
    };
  });

  // -------------------------
  // 5) 최종 옵션
  // -------------------------
  return {
    grid: finalGrid,

    xAxis: {
      type: "category",
      data: xAxisData,

      axisLabel: { show: true, color: P.axisText },

      // ✅ 핵심: 라벨 중앙이 아니라 "카테고리 경계"에 tick을 두기
      axisTick: {
        show: true,
        alignWithLabel: false, // ✅ 여기! (이전 true였다면 듀얼에서 막대에 가려짐)
        length: 0
      },

      axisLine: { show: true },

      // ✅ 세로 점선 강제
      splitLine: {
        show: true,
        interval: 0,
        lineStyle: {
          color: P.gridLineX,
          type: (splitLine?.x?.type ?? "dashed"),
          width: (splitLine?.x?.width ?? 1)
        }
      }
    },

    yAxis: yAxisStyled,

    // ✅ 듀얼축일 때 기본 간격 확대 (override 가능)
    barGap: finalBarGap,
    barCategoryGap: finalBarCategoryGap,

    series: series.map((s) => ({
      ...s,
      cursor: 'default',
      emphasis: {
        disabled: false,
        focus: 'none',

        itemStyle: {
          color: s.itemStyle?.color
        },

        label: {
          ...labelStyle,
          show: true,
          z: 999,
          zlevel: 1,

          // 필요 시 hover 라벨만 살짝 크게
          fontSize: isMobile ? 10 : 12,
          padding: isMobile ? [4, 7] : [5, 10],

          // ✅ 색상 변경 방지
          backgroundColor: labelStyle.backgroundColor ?? P.labelBg,
          borderColor: labelStyle.borderColor ?? P.labelBorder,
          color: labelStyle.color ?? P.labelText,
          shadowColor: labelStyle.shadowColor ?? P.shadow,

          formatter: (params) => echarts.format.addCommas(params.value),
        },
      },
      select: { disabled: true },
      label: {
        ...labelStyle,
        backgroundColor: labelStyle.backgroundColor ?? P.labelBg,
        borderColor: labelStyle.borderColor ?? P.labelBorder,
        color: labelStyle.color ?? P.labelText,
        shadowColor: labelStyle.shadowColor ?? P.shadow,
        formatter: (params) => echarts.format.addCommas(params.value),
      },
    })),
  };
}
function createDonutChartOption({
  theme = 'light',
  palette = {},

  data = [],

  // 도넛 크기/두께
  radius = ['25%', '70%'], // [inner, outer]
  center = ['30%', '50%'], // 왼쪽에 도넛, 오른쪽에 legend 공간

  // legend(우측 리스트)
  showLegend = true,
  legendRight = 0,
  legendTop = 'middle',
  legendItemGap = 18,

  // 퍼센트 소수점
  percentDigits = 1,

  // tooltip
  showTooltip = false
}) {
  const DEFAULT_PALETTE = {
    light: {
      text: '#111111',
      subText: '#848E9A',
      border: '#CDD0D6'
    },
    dark: {
      text: '#FAFAFA',
      subText: '#9E9E9E',
      border: '#5C5C5C'
    }
  };

  const P = { ...DEFAULT_PALETTE[theme], ...palette };

  const total = data.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const pct = (v) => (total ? (v / total) * 100 : 0);

  return {
    tooltip: showTooltip
      ? {
          trigger: 'item',
          formatter: (p) => `${p.name}<br/>${echarts.format.addCommas(p.value)} (${p.percent}%)`
        }
      : { show: false },

    legend: showLegend
      ? {
          selectedMode: false,
          orient: 'vertical',
          right: 0,
          top: 'middle',
          itemWidth: 12,
          itemHeight: 12,
          icon: 'circle',
          itemGap: 10,

          formatter: (name) => {
            const found = data.find((d) => d.name === name);
            const p = found ? pct(found.value) : 0;
            return `{name|${name}}{pct|${p.toFixed(percentDigits)}%}`;
          },

          textStyle: {
            rich: {
              name: {
                color: P.text,
                fontSize: 14,
                fontWeight: 500,
                width: 70
              },
              pct: {
                color: P.text,
                fontSize: 14,
                fontWeight: 500,
                align: 'right',
                width: 40
              }
            }
          }
        }
      : { show: false },

    series: [
      {
        type: 'pie',
        radius,
        center,
        cursor: 'default',
        avoidLabelOverlap: true,
        emphasis: { disabled: true },
        select: { disabled: true },

        // ✅ 도넛 조각 사이 경계가 거의 안 보이게
        itemStyle: {
          borderWidth: 0
        },

        // ✅ 차트 내부 라벨은 숨김(우측 legend 사용)
        label: { show: false },
        labelLine: { show: false },

        data
      }
    ]
  };
}

const ChartManager = (function () {
  const charts = new Map();
  const lastRenders = new Map();
  const BP = 768;

  function isMobile() {
    return window.innerWidth <= BP;
  }

  function getTheme() {
    const root = document.documentElement;

    return root.getAttribute('data-theme') === 'dark'
      ? 'dark'
      : 'light';
  }

  function render(id, option) {
    const el = document.getElementById(id);

    if (!el) return;

    let chart = charts.get(id);

    if (!chart) {
      chart = echarts.init(el);
      charts.set(id, chart);
    }

    chart.setOption(option, true);

    return chart;
  }

  function dispose(id) {
    const el = document.getElementById(id);

    if (!el) return;

    const inst = echarts.getInstanceByDom(el);

    if (inst) inst.dispose();

    charts.delete(id);
  }

  function resizeAll() {
    charts.forEach((c) => c.resize());
  }

  function debounce(fn, delay) {
    let t;

    return function () {
      clearTimeout(t);
      t = setTimeout(fn, delay);
    };
  }

  // -----------------------------------
  // 공통 라벨 스타일
  // -----------------------------------
  function getLabelStyle() {
    return {
      show: true,
      position: 'top',

      fontSize: isMobile() ? 9 : 11,
      fontWeight: 600,

      padding: isMobile() ? [3, 6] : [4, 8],

      distance: isMobile() ? 4 : 6,

      color: '#222',

      backgroundColor: '#F3F4F6',

      borderColor: '#D0D5DD',

      borderWidth: 1,

      borderRadius: 999,

      z: 100,

      formatter(value) {
        return value.value.toLocaleString();
      }
    };
  }

  // -----------------------------------
  // 공통 Series 생성
  // -----------------------------------
  function createSeries(series, yAxisIndex = 0) {
    return {
      type: 'bar',

      ...series,

      yAxisIndex,

      emphasis: {
        focus: 'self',
        scale: true,
        scaleSize: 4,
        z: 100
      },

      label: {
        ...getLabelStyle()
      }
    };
  }

  // -----------------------------------
  // Single Chart
  // -----------------------------------
  function renderSingle(id, config) {
    lastRenders.set(id, {
      type: 'single',
      args: [id, config]
    });

    render(
      id,
      createBarChartOption({
        theme: getTheme(),

        isMobile: isMobile(),

        hideYAxisOnMobile: true,

        mobileGrid: {
          left: 0,
          right: 0
        },

        grid: {
          top: 80,
          left: 0,
          right: 0,
          bottom: 30,
          containLabel: true
        },

        ...config,

        labelStyle: getLabelStyle()
      })
    );
  }

  // -----------------------------------
  // Dual Chart
  // -----------------------------------
  function renderDual({
    dualId,
    leftId,
    rightId,
    xAxisData,
    leftSeries,
    rightSeries
  }) {
    const theme = getTheme();

    lastRenders.set(dualId, {
      type: 'dual',
      args: [{
        dualId,
        leftId,
        rightId,
        xAxisData,
        leftSeries,
        rightSeries
      }]
    });

    // -----------------------------
    // Desktop
    // -----------------------------
    if (!isMobile()) {
      dispose(leftId);
      dispose(rightId);

      render(
        dualId,
        createBarChartOption({
          theme,

          isMobile: false,

          xAxisData,

          // ✅ 라벨 공간 확보
          grid: {
            top: 80,
            left: 20,
            right: 20,
            bottom: 30,
            containLabel: true
          },

          // ✅ 막대 간격 조정
          barCategoryGap: '35%',
          barGap: '30%',

          labelStyle: getLabelStyle(),

          yAxis: [
            {
              type: 'value',
              position: 'left',
              axisLine: {
                show: true
              }
            },

            {
              type: 'value',
              position: 'right',

              axisLine: {
                show: true
              },

              splitLine: {
                show: false
              }
            }
          ],

          seriesData: [
            createSeries(leftSeries, 0),
            createSeries(rightSeries, 1)
          ]
        })
      );

      return;
    }

    // -----------------------------
    // Mobile Split
    // -----------------------------
    dispose(dualId);

    render(
      leftId,
      createBarChartOption({
        theme,

        isMobile: true,

        hideYAxisOnMobile: true,

        mobileGrid: {
          left: 0,
          right: 0
        },

        grid: {
          top: 70,
          left: 0,
          right: 0,
          bottom: 20,
          containLabel: true
        },

        xAxisData,

        labelStyle: getLabelStyle(),

        seriesData: [
          createSeries(leftSeries, 0)
        ]
      })
    );

    render(
      rightId,
      createBarChartOption({
        theme,

        isMobile: true,

        hideYAxisOnMobile: true,

        mobileGrid: {
          left: 0,
          right: 0
        },

        grid: {
          top: 70,
          left: 0,
          right: 0,
          bottom: 20,
          containLabel: true
        },

        xAxisData,

        labelStyle: getLabelStyle(),

        seriesData: [
          createSeries(rightSeries, 0)
        ]
      })
    );
  }

  // -----------------------------------
  // Grouped / Split
  // -----------------------------------
  function renderGroupedOrSplit({
    dualId,
    leftId,
    rightId,
    xAxisData,
    leftSeries,
    rightSeries,
    labelPreset = 'pill'
  }) {
    const theme = getTheme();

    lastRenders.set(dualId, {
      type: 'grouped',
      args: [{
        dualId,
        leftId,
        rightId,
        xAxisData,
        leftSeries,
        rightSeries,
        labelPreset
      }]
    });

    const labelStyle = getLabelStyle();

    // -----------------------------
    // Desktop
    // -----------------------------
    if (!isMobile()) {
      dispose(leftId);
      dispose(rightId);

      render(
        dualId,
        createBarChartOption({
          theme,

          isMobile: false,

          xAxisData,

          // ✅ 라벨 영역 확보
          grid: {
            top: 80,
            left: 20,
            right: 20,
            bottom: 30,
            containLabel: true
          },

          // ✅ 막대 간격 축소
          barCategoryGap: '35%',
          barGap: '30%',

          labelStyle,

          seriesData: [
            createSeries(leftSeries, 0),
            createSeries(rightSeries, 0)
          ]
        })
      );

      return;
    }

    // -----------------------------
    // Mobile Split
    // -----------------------------
    dispose(dualId);

    const mobileCommon = {
      theme,

      isMobile: true,

      hideYAxisOnMobile: true,

      mobileGrid: {
        left: 0,
        right: 0
      },

      grid: {
        top: 70,
        left: 0,
        right: 0,
        bottom: 20,
        containLabel: true
      },

      xAxisData,

      labelStyle
    };

    render(
      leftId,
      createBarChartOption({
        ...mobileCommon,

        seriesData: [
          createSeries(leftSeries, 0)
        ]
      })
    );

    render(
      rightId,
      createBarChartOption({
        ...mobileCommon,

        seriesData: [
          createSeries(rightSeries, 0)
        ]
      })
    );
  }

  // -----------------------------------
  // Donut
  // -----------------------------------
  function renderDonut(id, config) {
    lastRenders.set(id, {
      type: 'donut',
      args: [id, config]
    });

    render(
      id,
      createDonutChartOption({
        theme: getTheme(),
        ...config
      })
    );
  }

  // -----------------------------------
  // Re-render
  // -----------------------------------
  function rerenderAll() {
    lastRenders.forEach((meta) => {
      if (!meta) return;

      if (meta.type === 'donut') {
        return renderDonut(...meta.args);
      }

      if (meta.type === 'single') {
        return renderSingle(...meta.args);
      }

      if (meta.type === 'dual') {
        return renderDual(...meta.args);
      }

      if (meta.type === 'grouped') {
        return renderGroupedOrSplit(...meta.args);
      }
    });

    requestAnimationFrame(resizeAll);
  }

  // -----------------------------------
  // Init
  // -----------------------------------
  function init() {
    window.addEventListener(
      'resize',
      debounce(() => resizeAll(), 150)
    );

    const root = document.documentElement;

    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        if (
          m.type === 'attributes' &&
          m.attributeName === 'data-theme'
        ) {
          requestAnimationFrame(() => {
            requestAnimationFrame(rerenderAll);
          });
        }
      }
    });

    mo.observe(root, {
      attributes: true
    });
  }

  return {
    init,
    renderSingle,
    renderDual,
    renderGroupedOrSplit,
    renderDonut,
    resizeAll
  };
})();

/**
 * Advisor Card Hover
 * .advisor-card-grid.is-hoverable 내부 카드 호버 시
 * - 호버된 카드: .is-active
 * - 래퍼: .has-hover (비호버 카드 CSS 제어용)
 */
(() => {
  const GRID_SELECTOR = '.advisor-card-grid.is-hoverable';
  const CARD_SELECTOR = '.advisor-card';
  const DESKTOP_BP = 1024;

  const isDesktop = () => window.innerWidth >= DESKTOP_BP;

  function initHoverableGrid(grid) {
    if (grid.dataset.hoverInited) return;
    grid.dataset.hoverInited = 'true';

    const cards = grid.querySelectorAll(CARD_SELECTOR);

    cards.forEach((card) => {
      card.addEventListener('mouseenter', () => {
        if (!isDesktop()) return;
        grid.classList.add('has-hover');
        card.classList.add('is-active');
      });

      card.addEventListener('mouseleave', () => {
        if (!isDesktop()) return;
        card.classList.remove('is-active');
      });
    });

    grid.addEventListener('mouseleave', () => {
      if (!isDesktop()) return;
      grid.classList.remove('has-hover');
      cards.forEach((card) => card.classList.remove('is-active'));
    });
  }

  function initAll() {
    document.querySelectorAll(GRID_SELECTOR).forEach(initHoverableGrid);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // 동적으로 삽입된 그리드 대응
  const obs = new MutationObserver(() => initAll());
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();

// sticky element
(() => {
  const elements = document.querySelectorAll(".js-sticky-transform");
  if (!elements.length) return;

  const items = [];
  let ticking = false;
  let footerGap = 0;

  const isWebView = () => document.body.classList.contains("mobile");

  function getFooterElement() {
    return (
      document.querySelector("footer") ||
      document.querySelector(".footer") ||
      document.querySelector('[data-include-path="/patterns/footer.html"] footer')
    );
  }

  function getFooterTop() {
    const footer = getFooterElement();

    // 웹뷰처럼 footer가 없으면 제한 없이 동작
    if (!footer) return Infinity;

    return footer.getBoundingClientRect().top + window.scrollY;
  }

  function getRootRemValue(name) {
    const style = getComputedStyle(document.documentElement);
    const rootFontSize = parseFloat(style.fontSize) || 10;
    const value = parseFloat(style.getPropertyValue(name).trim());

    return Number.isFinite(value) ? value * rootFontSize : 0;
  }

  function getPaddingBottom() {
    return getRootRemValue("--padding-y-bottom");
  }

  function getPaddingTitleTop() {
    return getRootRemValue("--padding-title-top");
  }

  function getFooterGap() {
    return (
      getRootRemValue("--padding-y-bottom") +
      getRootRemValue("--gap-title-content") +
      getRootRemValue("--padding-title-top")
    );
  }

  function getStickyTarget(el) {
    return (
      el.querySelector(
        ".consult-detail-panel, .education-detail-panel, .sticky-detail-panel"
      ) || el
    );
  }

  function updateWebViewBottomSpace() {
    if (!isWebView()) {
      document.documentElement.style.removeProperty("--sticky-bottom-space");
      return;
    }

    let maxHeight = 0;

    items.forEach((item) => {
      const height = item.target.getBoundingClientRect().height;
      maxHeight = Math.max(maxHeight, height);
    });

    document.documentElement.style.setProperty(
      "--sticky-bottom-space",
      `${maxHeight + 24}px`
    );
  }

  function measure() {
    items.length = 0;

    elements.forEach((el) => {
      el.style.setProperty("--sticky-y", "0px");

      const rect = el.getBoundingClientRect();
      const startTop = rect.top + window.scrollY;
      const target = getStickyTarget(el);
      const isInContentsSection = !!el.closest(".contents-section");
      const isStickyDetailPanel = target.classList.contains("sticky-detail-panel");

      items.push({
        el,
        startTop,
        target,
        isInContentsSection,
        isStickyDetailPanel,
      });
    });
  }

  function update() {
    const scrollY = window.scrollY;
    const footerTop = getFooterTop();
    const paddingTitleTop = getPaddingTitleTop();

    const isFooterVisible = footerTop <= scrollY + window.innerHeight;

    items.forEach((item) => {
      const currentHeight = item.target.getBoundingClientRect().height;

      const defaultY = item.isStickyDetailPanel
        ? Math.max(0, scrollY - item.startTop + paddingTitleTop)
        : Math.max(0, scrollY - item.startTop);

      const gap = item.isInContentsSection ? getPaddingBottom() : footerGap;
      const maxY = Math.max(0, footerTop - item.startTop - currentHeight - gap);
      const y = Math.min(defaultY, maxY);

      item.el.style.setProperty("--sticky-y", `${y}px`);

      item.el.classList.toggle("is-hide", !isWebView() && isFooterVisible);
    });

    updateWebViewBottomSpace();
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  }

  function init() {
    footerGap = getFooterGap();
    measure();
    update();
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", init);
  window.addEventListener("load", init);

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest(
      ".consult-type-tab, [data-action='tab'], [data-js='consult-panel-toggle'], [data-js='sticky-panel-toggle']"
    );

    if (!trigger) return;

    requestAnimationFrame(init);
  });

  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(init);
    });

    elements.forEach((el) => {
      ro.observe(getStickyTarget(el));
    });

    const footer = getFooterElement();
    if (footer) ro.observe(footer);
  }

  init();
})();

// 모바일 전용: 아코디언 토글 (데스크톱에서는 타이틀 버튼이 숨겨져 동작 안 함)
(() => {
  document.querySelectorAll('[data-js="consult-panel-toggle"], [data-js="sticky-panel-toggle"]').forEach(function (trigger) {
    trigger.addEventListener("click", function () {
      var panel = this.closest(
        '[data-js="consult-panel"], [data-js="sticky-panel"]'
      );
      if (!panel) return;

      var isCollapsed = panel.classList.contains("is-collapsed");
      var iconUse = this.querySelector(
        ".consult-detail-panel__title-mob-icon use, .sticky--detail-panel__title-mob-icon use"
      );

      if (isCollapsed) {
        panel.classList.remove("is-collapsed");
        this.setAttribute("aria-expanded", "true");
        if (iconUse) iconUse.setAttribute("href", "#icon-chevron-down");
      } else {
        panel.classList.add("is-collapsed");
        this.setAttribute("aria-expanded", "false");
        if (iconUse) iconUse.setAttribute("href", "#icon-chevron-top");
      }
    });
  });

  document.querySelectorAll('.consult-type-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var panel = tab.closest('.consult-detail-panel');
      var group = tab.closest('.consult-type-tabs');
      if (!panel || !group) return;
      var targetPanelId = tab.getAttribute('data-panel');
      if (!targetPanelId) return;

      group.querySelectorAll('.consult-type-tab').forEach(function (t) {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');

      panel.querySelectorAll('.consult-detail-panel__panel').forEach(function (p) {
        if (p.getAttribute('data-panel') === targetPanelId) {
          p.classList.add('is-active');
          p.removeAttribute('hidden');
          p.setAttribute('aria-hidden', 'false');
        } else {
          p.classList.remove('is-active');
          p.setAttribute('hidden', '');
          p.setAttribute('aria-hidden', 'true');
        }
      });

      var submitBtn = panel.querySelector('.consult-detail-panel__footer .consult-detail-panel__submit');
      var submitText = tab.getAttribute('data-submit-text');
      if (submitBtn && submitText) {
        submitBtn.textContent = submitText;
      }
    });
  });

  document.querySelectorAll('.time-slot:not(:disabled)').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var grid = btn.closest('.time-slot-grid');
      if (!grid) return;
      grid.querySelectorAll('.time-slot.is-active').forEach(function (b) {
        b.classList.remove('is-active');
      });
      btn.classList.add('is-active');
    });
  });

  document.querySelectorAll('.filter-date__inner:not([disabled])').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.filter-date__item');
      var list = item.closest('.filter-date__list');
      if (!list) return;
      list.querySelectorAll('.filter-date__item').forEach(function (i) {
        i.classList.remove('is-selected');
      });
      item.classList.add('is-selected');
      btn.setAttribute('aria-current', 'date');
    });
  });
})();

let isCalendarMonthNavigating = false;

/**
 * Search Filter
 */
const AUTO_OPEN_EXCLUDE_CLASSES = [
  'filter-select--search',
  'filter-select--no-auto-open'
];
(function initSearchFilter() {
  var searchFilter = document.getElementById('search-filter');
  if (!searchFilter) return;

  var fieldSelect = searchFilter.querySelector('.filter-select--field');
  var methodSelect = searchFilter.querySelector('.filter-select--method');
  var regionSelects = searchFilter.querySelectorAll('.filter-select--region');

  function isMobile() {
    return window.innerWidth < 1024;
  }

  function updateControlsPadding() {
    var controls = searchFilter.querySelector('.search-filter__controls');
    if (!controls) return;

    controls.classList.remove(
      'search-filter__controls--padding-default',
      'search-filter__controls--padding-method'
    );

    if (searchFilter.classList.contains('is-open')) {
      if (methodSelect && methodSelect.classList.contains('is-open')) {
        controls.classList.add('search-filter__controls--padding-method');
      } else {
        controls.classList.add('search-filter__controls--padding-default');
      }
    }
  }

  function completeRangeDateBeforeClose(filterSelect) {
    if (!filterSelect) return;

    var calendarEl = filterSelect.querySelector('.js-calendar');
    completeRangeDateBeforeCloseByCalendar(calendarEl);

    updateDateState(filterSelect);
  }

  function closeFilterSelect(wrap) {
    if (!wrap) return;

    if (wrap.classList.contains('filter-select--date')) {
      var calendarEl = wrap.querySelector('.js-calendar');

      clearRangeHoverPreview(calendarEl);
      completeRangeDateBeforeClose(wrap);
      syncDateValueFromSelectedDay(wrap);
      updateDateState(wrap);
    }

    wrap.classList.remove('is-open');

    var trigger = wrap.querySelector('.filter-select__trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  function closeAll(except) {
    searchFilter.querySelectorAll('.filter-select.is-open').forEach(function (el) {
      if (el !== except) closeFilterSelect(el);
    });
  }

  function resetSearchInputIfEmptyValue(filterSelect) {
    if (!filterSelect || !filterSelect.classList.contains('filter-select--search')) return;

    var triggerVal = filterSelect.querySelector('.filter-select__value');
    var input = filterSelect.querySelector('[data-js="filter-search-text"]');
    if (!triggerVal || !input) return;

    var placeholder =
      filterSelect.dataset.filterValuePlaceholder ||
      input.getAttribute('placeholder') ||
      '';

    var hasSelectedValue = triggerVal.textContent.trim() !== placeholder.trim();

    if (!hasSelectedValue) {
      input.value = '';
      input.removeAttribute('value');
    }
  }

  function openFilterSelect(wrap) {
    if (!wrap) return;

    closeAll(wrap);
    resetSearchInputIfEmptyValue(wrap);

    wrap.classList.add('is-open');

    var trigger = wrap.querySelector('.filter-select__trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');

    updateControlsPadding();
  }

  function isDisabledFilterSelect(filterSelect) {
    if (!filterSelect) return true;

    var trigger = filterSelect.querySelector('.filter-select__trigger');

    return (
      !trigger ||
      trigger.disabled ||
      trigger.classList.contains('is-disabled')
    );
  }

  function isAutoOpenExcludedFilterSelect(filterSelect) {
    if (!filterSelect) return true;

    return AUTO_OPEN_EXCLUDE_CLASSES.some(function (className) {
      return filterSelect.classList.contains(className);
    });
  }

  function openNextAvailableFilter(currentSelect) {
    if (!currentSelect) return;

    var nextSelect = currentSelect.nextElementSibling;

    while (nextSelect) {
      if (
        nextSelect.classList &&
        nextSelect.classList.contains('filter-select')
      ) {
        if (
          !isDisabledFilterSelect(nextSelect) &&
          !isAutoOpenExcludedFilterSelect(nextSelect)
        ) {
          openFilterSelect(nextSelect);
          return;
        }
      }

      nextSelect = nextSelect.nextElementSibling;
    }

    closeAll();
  }

  function shouldKeepOpenAfterSelect(currentSelect, options) {
    if (!currentSelect) return false;

    options = options || {};

    var calendarEl = currentSelect.querySelector('.js-calendar');

    var isRangeDate =
      currentSelect.classList.contains('filter-select--date') &&
      calendarEl &&
      calendarEl.getAttribute('data-calendar-mode') === 'range';

    var hasChipList = !!currentSelect.querySelector('.filter-chip-list');

    // 기간달력은 어떤 경우에도 자동 닫힘 방지
    if (isRangeDate) return true;

    // filter-submit 클릭일 때만 chipList 예외를 무시
    if (!options.ignoreChipList && hasChipList) return true;

    return false;
  }

  function closeAfterSelect(currentSelect, options) {
    if (!currentSelect) return;

    if (shouldKeepOpenAfterSelect(currentSelect, options)) {
      return;
    }

    openNextAvailableFilter(currentSelect);
  }
  window.openNextSearchFilterAfterSelect = function (currentSelect) {
    closeAfterSelect(currentSelect);
  };

  function getOptionTitleText(option) {
    if (!option) return '';

    var titleEl = option.querySelector('.filter-option__title');
    if (!titleEl) return '';

    var clone = titleEl.cloneNode(true);
    var badge = clone.querySelector('.filter-badge');
    if (badge) badge.remove();

    return clone.textContent.trim();
  }

  function setTriggerValueText(triggerVal, text) {
    if (!triggerVal) return;

    var img = triggerVal.querySelector('.img');
    triggerVal.innerHTML = '';

    if (img) {
      triggerVal.appendChild(img);
      triggerVal.appendChild(document.createTextNode(' '));
    }

    triggerVal.appendChild(document.createTextNode(text));
  }

  function syncTriggerActive(filterSelect) {
    var trigger = filterSelect.querySelector('.filter-select__trigger');
    if (!trigger) return;

    if (filterSelect.classList.contains('filter-select--field')) {
      var selectedOpt = filterSelect.querySelector('.filter-option.is-selected');
      var chipCount = selectedOpt ? selectedOpt.querySelectorAll('.filter-chip.is-active').length : 0;
      trigger.classList.toggle('is-active', !!selectedOpt || chipCount > 0);
      return;
    }

    if (filterSelect.classList.contains('filter-select--date')) {
      var input = filterSelect.querySelector('input');
      trigger.classList.toggle('is-active', !!(input && input.value.trim()));
      return;
    }

    var hasValue =
      !!filterSelect.querySelector('.filter-option.is-selected') ||
      !!filterSelect.querySelector('.filter-region-chip.is-selected') ||
      !!filterSelect.querySelector('.filter-search-suggestion.is-selected');

    trigger.classList.toggle('is-active', hasValue);
  }

  function updateMethodTriggerImage(filterSelect, selectedOpt) {
    if (!filterSelect.classList.contains('filter-select--method')) return;

    var triggerVal = filterSelect.querySelector('.filter-select__value');
    if (!triggerVal) return;

    var imgWrap = triggerVal.querySelector('.img');
    if (!imgWrap) return;

    var optionImg = selectedOpt.querySelector('.filter-option__icon img');
    if (!optionImg) return;

    imgWrap.innerHTML = '';

    var newImg = optionImg.cloneNode(true);
    newImg.alt = getOptionTitleText(selectedOpt) || optionImg.alt || '';
    imgWrap.appendChild(newImg);
  }

  function updateFieldSelectValue(filterSelect) {
    var selectedOpt = filterSelect.querySelector('.filter-option.is-selected');
    var triggerVal = filterSelect.querySelector('.filter-select__value');
    var preview = filterSelect.querySelector('.filter-select__chips-preview');

    if (!selectedOpt || !triggerVal) return;

    var categoryName = getOptionTitleText(selectedOpt);
    var chipCount = selectedOpt.querySelectorAll('.filter-chip.is-active').length;

    triggerVal.innerHTML = '';
    triggerVal.appendChild(document.createTextNode(categoryName));

    if (chipCount > 0) {
      var countBadge = document.createElement('span');
      countBadge.className = 'filter-select__value-count';
      countBadge.textContent = String(chipCount);

      triggerVal.appendChild(document.createTextNode(' '));
      triggerVal.appendChild(countBadge);
    }

    if (preview) preview.innerHTML = '';

    syncTriggerActive(filterSelect);
  }

  function updateMethodSelectValue(filterSelect) {
    var selectedOpt = filterSelect.querySelector('.filter-option.is-selected');
    var triggerVal = filterSelect.querySelector('.filter-select__value');
    if (!selectedOpt || !triggerVal) return;

    var categoryName = getOptionTitleText(selectedOpt);

    updateMethodTriggerImage(filterSelect, selectedOpt);

    var imgWrap = triggerVal.querySelector('.img');
    triggerVal.innerHTML = '';

    if (imgWrap) {
      triggerVal.appendChild(imgWrap);
      triggerVal.appendChild(document.createTextNode(' '));
    }

    triggerVal.appendChild(document.createTextNode(categoryName));

    syncTriggerActive(filterSelect);
  }

  function updateDefaultSelectValue(filterSelect) {
    var selectedOpt = filterSelect.querySelector('.filter-option.is-selected');
    var triggerVal = filterSelect.querySelector('.filter-select__value');
    if (!selectedOpt || !triggerVal) return;

    triggerVal.textContent = getOptionTitleText(selectedOpt);
    syncTriggerActive(filterSelect);
  }

  function updateSelectValue(filterSelect) {
    if (!filterSelect) return;

    if (filterSelect.classList.contains('filter-select--field')) {
      updateFieldSelectValue(filterSelect);
      return;
    }

    if (filterSelect.classList.contains('filter-select--method')) {
      updateMethodSelectValue(filterSelect);
      return;
    }

    updateDefaultSelectValue(filterSelect);
  }

  function updateRegionChipDisplay(parentSelect) {
    var panel = parentSelect.querySelector('.filter-select__panel');
    var triggerVal = parentSelect.querySelector('.filter-select__value');
    var trigger = parentSelect.querySelector('.filter-select__trigger');
    if (!triggerVal) return;

    var placeholder = parentSelect.dataset.filterValuePlaceholder || '';

    if (panel && panel.classList.contains('multi-input-value')) {
      var parts = [];

      panel.querySelectorAll('.filter-select__panel-body--chips').forEach(function (segment) {
        var sel = segment.querySelector('.filter-region-chip.is-selected');
        if (sel) parts.push(sel.textContent.trim());
      });

      setTriggerValueText(triggerVal, parts.length ? parts.join(' / ') : placeholder);
      if (trigger) trigger.classList.toggle('is-active', parts.length > 0);
      return;
    }

    var one = parentSelect.querySelector('.filter-region-chip.is-selected');

    if (one) {
      setTriggerValueText(triggerVal, one.textContent.trim());
      if (trigger) trigger.classList.add('is-active');
    } else {
      setTriggerValueText(triggerVal, placeholder);
      if (trigger) trigger.classList.remove('is-active');
    }
  }

  function updateTextareaState(filterSelect) {
    if (!filterSelect) return;

    var textarea = filterSelect.querySelector('textarea');
    var trigger = filterSelect.querySelector('.filter-select__trigger');
    var triggerVal = filterSelect.querySelector('.filter-select__value');
    if (!textarea || !trigger || !triggerVal) return;

    var hasValue = textarea.value.trim().length > 0;
    triggerVal.textContent = hasValue ? '작성완료' : '사유 입력';
    trigger.classList.toggle('is-active', hasValue);
  }

  function updateDateState(filterSelect) {
    if (!filterSelect) return;

    var trigger = filterSelect.querySelector('.filter-select__trigger');
    var input = filterSelect.querySelector('input');
    if (!trigger || !input) return;

    trigger.classList.toggle('is-active', !!input.value.trim());
  }

  function formatDateFromAriaLabel(label) {
    if (!label) return '';

    var match = label.match(/(\d+)월\s*(\d+),\s*(\d+)/);
    if (!match) return '';

    var month = String(match[1]).padStart(2, '0');
    var day = String(match[2]).padStart(2, '0');
    var year = String(match[3]);

    return year + '.' + month + '.' + day;
  }

  function syncDateValueFromSelectedDay(filterSelect) {
    if (!filterSelect) return;

    var input = filterSelect.querySelector('input');
    var trigger = filterSelect.querySelector('.filter-select__trigger');
    var calendarEl = filterSelect.querySelector('.js-calendar');

    if (!input || !trigger || !calendarEl) return;

    var fp = calendarEl._flatpickr;
    var calendarMode = calendarEl.getAttribute('data-calendar-mode') || '';
    var isRangeMode = calendarMode === 'range';

    if (isRangeMode) {
      var selectedDates = fp && fp.selectedDates ? fp.selectedDates : [];

      if (selectedDates.length === 0) {
        input.value = '';
        input.removeAttribute('value');
        trigger.classList.remove('is-active');
        return;
      }

      if (selectedDates.length === 1) {
        input.value = '';
        input.removeAttribute('value');
        trigger.classList.remove('is-active');
        return;
      }

      var startText = fp.formatDate(selectedDates[0], 'Y.m.d');
      var endText = fp.formatDate(selectedDates[1], 'Y.m.d');
      var rangeText = startText + ' ~ ' + endText;

      input.value = rangeText;
      input.setAttribute('value', rangeText);
      updateDateState(filterSelect);
      return;
    }

    var selectedDay = filterSelect.querySelector('.flatpickr-day.selected');

    if (!selectedDay) {
      input.value = '';
      input.removeAttribute('value');
      trigger.classList.remove('is-active');
      return;
    }

    var dateText = formatDateFromAriaLabel(selectedDay.getAttribute('aria-label'));
    if (!dateText) return;

    input.value = dateText;
    input.setAttribute('value', dateText);
    updateDateState(filterSelect);
  }

  function resetFilterSelect(filterSelect) {
    if (!filterSelect) return;

    var placeholder = filterSelect.dataset.filterValuePlaceholder || '';
    var trigger = filterSelect.querySelector('.filter-select__trigger');
    var triggerVal = filterSelect.querySelector('.filter-select__value');
    var preview = filterSelect.querySelector('.filter-select__chips-preview');

    filterSelect.querySelectorAll('.filter-option.is-selected').forEach(function (el) {
      el.classList.remove('is-selected');
    });

    filterSelect.querySelectorAll('.filter-chip.is-active').forEach(function (el) {
      el.classList.remove('is-active');
    });

    filterSelect.querySelectorAll('.filter-region-chip.is-selected').forEach(function (el) {
      el.classList.remove('is-selected');
      el.removeAttribute('aria-selected');
    });

    filterSelect.querySelectorAll('.filter-search-suggestion.is-selected').forEach(function (el) {
      el.classList.remove('is-selected');
      el.removeAttribute('aria-selected');
    });

    filterSelect.querySelectorAll('input').forEach(function (input) {
      input.value = '';
      input.removeAttribute('value');

      if (input._flatpickr) {
        input._flatpickr.clear();
      }
    });

    filterSelect.querySelectorAll('.js-calendar').forEach(function (calendar) {
      if (calendar._flatpickr) {
        calendar._flatpickr.clear();
      }
    });

    if (preview) preview.innerHTML = '';

    if (filterSelect.classList.contains('filter-select--date')) {
      updateDateState(filterSelect);
    } else if (filterSelect.classList.contains('filter-select--region')) {
      updateRegionChipDisplay(filterSelect);
    } else if (triggerVal) {
      setTriggerValueText(triggerVal, placeholder);
    }

    if (trigger) {
      trigger.classList.remove('is-active');
      trigger.setAttribute('aria-expanded', 'false');
    }

    closeFilterSelect(filterSelect);
  }

  searchFilter.querySelectorAll('.filter-select').forEach(function (select) {
    var triggerValue = select.querySelector('.filter-select__value');

    if (triggerValue && select.dataset.filterValuePlaceholder === undefined) {
      select.dataset.filterValuePlaceholder = triggerValue.textContent.trim();
    }
  });

  searchFilter.addEventListener('click', function (e) {
    var resetBtn = e.target.closest('.filter-select__value-group .btn--icon');
    if (!resetBtn) return;

    var filterSelect = resetBtn.closest('.filter-select');
    if (!filterSelect) return;

    e.preventDefault();
    e.stopPropagation();

    resetFilterSelect(filterSelect);
  });

  searchFilter.addEventListener('click', function (e) {
    var day = e.target.closest('.filter-select--date .flatpickr-day');
    if (!day) return;

    if (
      day.classList.contains('flatpickr-disabled') ||
      day.classList.contains('disabled')
    ) {
      return;
    }

    var filterSelect = day.closest('.filter-select--date');
    if (!filterSelect) return;

    setTimeout(function () {
      syncDateValueFromSelectedDay(filterSelect);
      closeAfterSelect(filterSelect);
    }, 0);
  });

  searchFilter.querySelectorAll('.filter-option').forEach(function (opt) {
    opt.addEventListener('click', function (e) {
      if (e.target.closest('.filter-chip-list')) return;

      var parentSelect = opt.closest('.filter-select');
      if (!parentSelect) return;

      parentSelect.querySelectorAll('.filter-option').forEach(function (o) {
        o.classList.remove('is-selected');
      });

      opt.classList.add('is-selected');
      updateSelectValue(parentSelect);

      if (opt.querySelector('.filter-chip-list')) {
        return;
      }

      closeAfterSelect(parentSelect);
    });
  });

  searchFilter.querySelectorAll('.filter-chip-list').forEach(function (chipList) {
    chipList.addEventListener('click', function (e) {
      e.stopPropagation();

      var chip = e.target.closest('.filter-chip');
      if (!chip) return;

      var option = chip.closest('.filter-option');
      var parentSelect = chip.closest('.filter-select');
      if (!option || !parentSelect) return;

      parentSelect.querySelectorAll('.filter-option').forEach(function (o) {
        o.classList.remove('is-selected');
      });

      option.classList.add('is-selected');
      chip.classList.toggle('is-active');

      updateSelectValue(parentSelect);
    });
  });

  searchFilter.querySelectorAll('.filter-submit').forEach(function (submit) {
    submit.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      var parentSelect = submit.closest('.filter-select');
      if (!parentSelect) return;

      closeAfterSelect(parentSelect, {
        ignoreChipList: true
      });
    });
  });

  searchFilter.querySelectorAll('.filter-region-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var parentSelect = chip.closest('.filter-select--region');
      if (!parentSelect) return;

      var panel = parentSelect.querySelector('.filter-select__panel');
      var multiSegment = panel && panel.classList.contains('multi-input-value');

      if (multiSegment) {
        var segment = chip.closest('.filter-select__panel-body--chips');
        if (!segment) return;

        var segments = panel.querySelectorAll('.filter-select__panel-body--chips');
        var segmentIndex = Array.prototype.indexOf.call(segments, segment);

        segment.querySelectorAll('.filter-region-chip').forEach(function (c) {
          c.classList.remove('is-selected');
          c.removeAttribute('aria-selected');
        });

        for (var s = segmentIndex + 1; s < segments.length; s++) {
          segments[s].querySelectorAll('.filter-region-chip').forEach(function (c) {
            c.classList.remove('is-selected');
            c.removeAttribute('aria-selected');
          });
        }
      } else {
        parentSelect.querySelectorAll('.filter-region-chip').forEach(function (c) {
          c.classList.remove('is-selected');
          c.removeAttribute('aria-selected');
        });
      }

      chip.classList.add('is-selected');
      chip.setAttribute('aria-selected', 'true');

      updateRegionChipDisplay(parentSelect);
      closeAfterSelect(parentSelect);
    });
  });

  searchFilter.querySelectorAll('.filter-select--search').forEach(function (searchSelect) {
    searchSelect.addEventListener('click', function (e) {
      var suggestion = e.target.closest('.filter-search-suggestion');
      if (!suggestion || !searchSelect.contains(suggestion)) return;

      var value = suggestion.getAttribute('data-value') || suggestion.textContent.trim();
      var triggerVal = searchSelect.querySelector('.filter-select__value');
      var trigger = searchSelect.querySelector('.filter-select__trigger');

      searchSelect.querySelectorAll('.filter-search-suggestion').forEach(function (el) {
        el.classList.remove('is-selected');
        el.removeAttribute('aria-selected');
      });

      suggestion.classList.add('is-selected');
      suggestion.setAttribute('aria-selected', 'true');

      if (triggerVal) triggerVal.textContent = value;
      if (trigger) trigger.classList.add('is-active');

      closeAfterSelect(searchSelect);
    });
  });

  searchFilter.querySelectorAll('.filter-select').forEach(function (wrap) {
    wrap.addEventListener('click', function (e) {

      var trigger = wrap.querySelector('.filter-select__trigger');

      if (!trigger || trigger.disabled || trigger.classList.contains('is-disabled')) {
        return;
      }

      if (e.target.closest('.filter-select__value-group .btn--icon')) return;
      if (e.target.closest('.filter-select__panel')) return;
      if (e.target.closest('.flatpickr-calendar')) return;
      if (e.target.closest('.flatpickr-current-month-selects')) return;
      if (e.target.closest('.flatpickr-year-select')) return;
      if (e.target.closest('.flatpickr-month-select')) return;

      e.stopPropagation();

      if (wrap.classList.contains('is-open')) {
        closeFilterSelect(wrap);
      } else {
        openFilterSelect(wrap);
      }
    });
  });

  searchFilter.querySelectorAll('.filter-select__panel-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var wrap = btn.closest('.filter-select');
      if (wrap) closeFilterSelect(wrap);
    });
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('#search-filter .filter-select')) {
      closeAll();
    }
  });

  function openStep(select) {
    closeAll();
    if (!select) return;

    resetSearchInputIfEmptyValue(select);

    select.classList.add('is-open');

    var trigger = select.querySelector('.filter-select__trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');

    updateControlsPadding();
  }

  function openMobileModal() {
    searchFilter.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    openStep(fieldSelect);
  }

  function closeMobileModal() {
    searchFilter.classList.remove('is-open');
    closeAll();
    updateControlsPadding();
    document.body.style.overflow = '';
  }

  var mobileBtn = searchFilter.querySelector('[data-js="mobile-filter-open"]');
  if (mobileBtn) mobileBtn.addEventListener('click', openMobileModal);

  searchFilter.querySelectorAll('.search-filter__modal-submit').forEach(function (btn) {
    btn.addEventListener('click', closeMobileModal);
  });

  searchFilter.querySelectorAll('[data-js="mobile-filter-back"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var openRegion = searchFilter.querySelector('.filter-select--region.is-open');
      var openSearch = searchFilter.querySelector('.filter-select--search.is-open');

      if (openSearch) {
        if (openRegion) {
          openStep(openRegion);
        } else if (regionSelects.length) {
          openStep(regionSelects[regionSelects.length - 1]);
        } else {
          openStep(methodSelect);
        }
      } else if (openRegion) {
        openStep(methodSelect);
      } else if (methodSelect && methodSelect.classList.contains('is-open')) {
        openStep(fieldSelect);
      } else {
        closeMobileModal();
      }
    });
  });

  searchFilter.querySelectorAll('[data-js="mobile-filter-close"]').forEach(function (btn) {
    btn.addEventListener('click', closeMobileModal);
  });

  searchFilter.querySelectorAll('.filter-select__trigger').forEach(function (trigger) {
    trigger.addEventListener('click', function (e) {
      if (!searchFilter.classList.contains('is-open')) return;

      if (e.target.closest('.filter-select__value-group .btn--icon')) return;

      e.stopPropagation();
      openStep(trigger.closest('.filter-select'));
    });
  });

  searchFilter.querySelectorAll('.filter-select__label').forEach(function (label) {
    label.addEventListener('click', function () {
      if (!searchFilter.classList.contains('is-open')) return;

      var wrap = label.closest('.filter-select');
      if (wrap && wrap.classList.contains('is-open')) {
        closeFilterSelect(wrap);
      }
    });
  });

  var textareaSelect = searchFilter.querySelector('.filter-select--textarea');
  if (textareaSelect) {
    var textarea = textareaSelect.querySelector('textarea');
    if (textarea) {
      textarea.addEventListener('input', function () {
        updateTextareaState(textareaSelect);
      });

      updateTextareaState(textareaSelect);
    }
  }

  searchFilter.querySelectorAll('.filter-select--date').forEach(function (dateSelect) {
    syncDateValueFromSelectedDay(dateSelect);
    updateDateState(dateSelect);
  });

  var pcMql = window.matchMedia('(min-width: 1024px)');
  pcMql.addEventListener('change', function (e) {
    if (e.matches && searchFilter.classList.contains('is-open')) {
      closeMobileModal();
    }
  });

  searchFilter.querySelectorAll('.filter-select').forEach(function (select) {
    if (select.classList.contains('filter-select--region')) {
      updateRegionChipDisplay(select);
      return;
    }

    if (select.classList.contains('filter-select--date')) {
      syncDateValueFromSelectedDay(select);
      return;
    }

    if (select.querySelector('.filter-option.is-selected')) {
      updateSelectValue(select);
    }
  });
})();

function closeDateFilterSelect(calendarEl) {
  const filterSelect = calendarEl.closest(".filter-select");
  if (!filterSelect) return;

  const isRangeCalendar =
    calendarEl.getAttribute("data-calendar-mode") === "range";

  const input = filterSelect.querySelector("input");
  const trigger = filterSelect.querySelector(".filter-select__trigger");

  if (trigger) {
    trigger.classList.toggle("is-active", !!(input && input.value.trim()));
  }

  // 기간 달력은 자동 닫힘/다음 오픈 방지
  if (isRangeCalendar) return;

  filterSelect.classList.remove("is-open");

  if (trigger) {
    trigger.setAttribute("aria-expanded", "false");
  }

  if (typeof window.openNextSearchFilterAfterSelect === "function") {
    setTimeout(function () {
      window.openNextSearchFilterAfterSelect(filterSelect);
    }, 0);
  }
}

function isSameCalendarDate(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function normalizeRangeDate(fp) {
  if (!fp || fp.config.mode !== "range" || fp.selectedDates.length !== 2) return;

  const start = fp.selectedDates[0];
  const end = fp.selectedDates[1];

  if (!isSameCalendarDate(start, end)) return;

  const next = new Date(start);
  next.setDate(next.getDate() + 1);

  fp.setDate([start, next], false);
}

/* ===== Calendar Position (fixed) ===== */
function positionCalendarWrap(inputGroup) {
  if (!inputGroup) return;

  var calendarWrap = inputGroup.querySelector('.calendar-wrap');
  if (!calendarWrap) return;

  var isInModal = inputGroup.closest('.modal');

  if (!isInModal) {
    calendarWrap.style.position = '';
    calendarWrap.style.top = '';
    calendarWrap.style.left = '';
    calendarWrap.style.right = '';
    calendarWrap.style.width = '';
    calendarWrap.style.maxWidth = '';
    calendarWrap.style.zIndex = '';
    return;
  }

  var rect = inputGroup.getBoundingClientRect();
  var gap = 4;
  var margin = 16;

  var viewportWidth = window.innerWidth;
  var viewportHeight = window.innerHeight;

  var targetWidth = Math.min(rect.width, viewportWidth - margin * 2);

  calendarWrap.style.position = 'fixed';
  calendarWrap.style.zIndex = '9999';
  calendarWrap.style.width = targetWidth + 'px';
  calendarWrap.style.maxWidth = 'calc(100vw - ' + margin * 2 + 'px)';

  var calendarHeight = calendarWrap.offsetHeight || 360;

  var left;

  if (calendarWrap.classList.contains('right')) {
    left = rect.right - targetWidth;
  } else {
    left = rect.left;
  }

  left = Math.max(
    margin,
    Math.min(left, viewportWidth - targetWidth - margin)
  );

  var top = rect.bottom + gap;

  if (top + calendarHeight > viewportHeight - margin) {
    top = rect.top - calendarHeight - gap;
  }

  top = Math.max(
    margin,
    Math.min(top, viewportHeight - calendarHeight - margin)
  );

  calendarWrap.style.top = top + 'px';
  calendarWrap.style.left = left + 'px';
  calendarWrap.style.right = 'auto';
}

function updateOpenedCalendarPosition() {
  var opened = document.querySelector('.input.is-open .calendar-wrap');
  if (!opened) return;

  var inputGroup = opened.closest('.input');
  if (!inputGroup) return;

  if (inputGroup.closest('.modal')) {
    positionCalendarWrap(inputGroup);
  }
}

function closeOpenedCalendarOnModalScroll(e) {
  var opened = document.querySelector('.input.is-open .calendar-wrap');
  if (!opened) return;

  var inputGroup = opened.closest('.input');
  if (!inputGroup) return;

  var modal = inputGroup.closest('.modal');
  if (!modal) return;

  var target = e.target;

  // 달력 / 연도 셀렉트 / 월 셀렉트 내부 스크롤은 닫지 않음
  if (
    target.closest('.calendar-wrap') ||
    target.closest('.flatpickr-calendar') ||
    target.closest('.flatpickr-current-month-selects') ||
    target.closest('.custom-select') ||
    target.closest('.select-dropdown')
  ) {
    return;
  }

  if (modal.contains(target)) {
    closeCalendar(inputGroup);
  }
}

document.addEventListener('pointerdown', function (e) {
  var navButton = e.target.closest(
    '.flatpickr-prev-month, .flatpickr-next-month'
  );

  if (!navButton) return;

  isCalendarMonthNavigating = true;
});

document.addEventListener('click', function (e) {
  var navButton = e.target.closest(
    '.flatpickr-prev-month, .flatpickr-next-month'
  );

  if (!navButton) return;

  /*
   * Flatpickr의 월 이동 처리와 onMonthChange가 모두 끝난 뒤 해제
   */
  setTimeout(function () {
    isCalendarMonthNavigating = false;
  }, 0);
});

document.addEventListener('click', function (e) {
  var inputGroup = e.target.closest('.input');
  var calendarWrap = e.target.closest('.calendar-wrap');
  var flatpickrCalendar = e.target.closest('.flatpickr-calendar');
  var openGroups = document.querySelectorAll('.input.is-open');

  if (flatpickrCalendar) {
    return;
  }

  if (inputGroup && inputGroup.querySelector('.calendar-wrap')) {
    var isOpen = inputGroup.classList.contains('is-open');

    openGroups.forEach(function (group) {
      if (group !== inputGroup) {
        closeCalendar(group);
      }
    });

    if (isOpen) {
      closeCalendar(inputGroup);
    } else {
      openCalendar(inputGroup);
    }

    return;
  }

  openGroups.forEach(function (group) {
    closeCalendar(group);
  });
});

function completeRangeDateBeforeCloseByCalendar(calendarEl) {
  if (!calendarEl || !calendarEl._flatpickr) return;

  /*
   * 월 이동 화살표를 누른 경우는 달력을 닫는 행위가 아님.
   * 다른 닫기 로직이 실수로 호출되더라도 기간을 자동 완성하지 않는다.
   */
  if (isCalendarMonthNavigating) return;

  var fp = calendarEl._flatpickr;

  if (fp.config.mode !== 'range') return;
  if (fp.selectedDates.length !== 1) return;

  var startDate = fp.selectedDates[0];
  var endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);

  fp.setDate([startDate, endDate], false);

  var inputWrap = calendarEl.closest('.input');
  var input = inputWrap ? inputWrap.querySelector('input') : null;

  if (input) {
    input.value =
      fp.selectedDates.length === 2
        ? fp.formatDate(fp.selectedDates[0], 'Y.m.d') +
          ' ~ ' +
          fp.formatDate(fp.selectedDates[1], 'Y.m.d')
        : '';

    input.setAttribute('value', input.value);
  }
}

function clearRangeHoverPreview(calendarEl) {
  if (!calendarEl || !calendarEl._flatpickr) return;

  var fp = calendarEl._flatpickr;

  if (fp.config.mode !== 'range') return;
  if (fp.selectedDates.length !== 1) return;

  fp.calendarContainer
    .querySelectorAll('.flatpickr-day.startRange, .flatpickr-day.inRange, .flatpickr-day.endRange')
    .forEach(function (day) {
      day.classList.remove('startRange', 'inRange', 'endRange');
    });
}

const closeCalendar = (group) => {
  if (!group) return;

  const calendarEl = group.querySelector('.js-calendar');

  clearRangeHoverPreview(calendarEl);
  completeRangeDateBeforeCloseByCalendar(calendarEl);

  if (!group.classList.contains('is-open')) return;

  group.classList.remove('is-open');

  group.dispatchEvent(
    new CustomEvent('calendar:close', {
      bubbles: true,
      detail: {
        group: group
      }
    })
  );
};

const openCalendar = (group) => {
  if (group.classList.contains('is-open')) return;

  group.classList.add('is-open');
  positionCalendarWrap(group);

  group.dispatchEvent(
    new CustomEvent('calendar:open', {
      bubbles: true,
      detail: {
        group: group
      }
    })
  );
};

document.addEventListener('scroll', closeOpenedCalendarOnModalScroll, true);

window.addEventListener('resize', updateOpenedCalendarPosition);
window.addEventListener('orientationchange', updateOpenedCalendarPosition);

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', updateOpenedCalendarPosition);
}

/**
 * 공통 슬라이드 모듈 (무한 슬라이드 기능 추가됨)
 * 카드 리스트를 스크롤하는 슬라이드 기능을 제공합니다.
 * 
 * 사용법:
 * - HTML에서 data-slide-container 속성을 가진 요소를 찾아 자동 초기화
 * - 또는 SlideController.init(containerSelector, options)로 수동 초기화
 * 
 * HTML 구조 예시 (기본):
 * <div class="support-section__wrapper" data-slide-container>
 *   <button class="support-section__nav-btn--prev" data-slide-prev>이전</button>
 *   <button class="support-section__nav-btn--next" data-slide-next>다음</button>
 *   <div class="support-section__card-list" data-slide-list>
 *     <article class="support-card">...</article>
 *   </div>
 * </div>
 * 
 * HTML 구조 예시 (그룹 슬라이드 + 페이지네이션):
 * <section class="schedule-section">
 *   <div class="schedule-section__header">
 *     <h2>제목</h2>
 *     <div class="schedule-section__pagination" data-slide-pagination></div>
 *   </div>
 *   <div class="schedule-section__wrapper" data-slide-container data-slide-group="2" data-slide-pagination=".schedule-section__pagination">
 *     <div class="schedule-section__card-list" data-slide-list>
 *       <article class="schedule-card">...</article>
 *     </div>
 *   </div>
 * </section>
 * 
 * 무한 슬라이드 사용법:
 * <div class="support-section__wrapper" data-slide-container data-slide-infinite>
 *   ...
 * </div>
 */
(function () {
  'use strict';

  /**
   * 슬라이드 컨트롤러 클래스
   */
  class SlideController {
    /**
     * @param {HTMLElement} container - 슬라이드 컨테이너 요소
     * @param {Object} options - 설정 옵션
     * @param {string} options.listSelector - 카드 리스트 선택자 (기본: '[data-slide-list]')
     * @param {string} options.prevBtnSelector - 이전 버튼 선택자 (기본: '[data-slide-prev]')
     * @param {string} options.nextBtnSelector - 다음 버튼 선택자 (기본: '[data-slide-next]')
     * @param {string} options.cardSelector - 카드 선택자 (기본: '.support-card')
     * @param {number} options.breakpoint - 버튼 표시 브레이크포인트 (기본: 1024)
     * @param {number} options.threshold - 스크롤 오차 허용 범위 (기본: 5)
     * @param {number} options.resizeDelay - 리사이즈 이벤트 딜레이 (기본: 100)
     * @param {number} options.groupSize - PC에서 묶을 카드 수 (기본: 1, 2로 설정하면 2개씩 묶음)
     * @param {boolean} options.pagination - 페이지네이션 사용 여부 (기본: false)
     * @param {string} options.paginationSelector - 페이지네이션 컨테이너 선택자
     * @param {boolean} options.transparentCard - 홀수 개일 때 투명 카드 추가 여부 (기본: false)
     * @param {string} options.transparentCardClass - 투명 카드 클래스명 (기본: 'schedule-card--transparent')
     * @param {number} options.maxPaginationDots - 최대 페이지네이션 도트 수 (기본: 5)
     * @param {boolean} options.infinite - 무한 슬라이드 모드 활성화 (기본: false, data-slide-infinite 속성으로도 설정 가능)
     */
    constructor(container, options = {}) {
      this.container = container;
      this.autoLoopIndex = 0;
      
      // 카드 선택자 자동 감지: data-slide-card 속성 또는 컨테이너 클래스 기반
      let defaultCardSelector = '.support-card';
      if (container.hasAttribute('data-slide-card')) {
        defaultCardSelector = container.getAttribute('data-slide-card');
      } else if (container.classList.contains('promo-travel__slider')) {
        defaultCardSelector = '.promo-travel__item';
      } else if (container.closest('.schedule-section')) {
        defaultCardSelector = '.schedule-card';
      }
      
      // 이벤트 슬라이드 감지 (수직 슬라이드)
      const isEventSlide = container.classList.contains('my-section__event-area');
      
      // data 속성에서 옵션 읽기
      const dataGroupSize = container.getAttribute('data-slide-group');
      const dataPagination = container.getAttribute('data-slide-pagination');
      const dataDirection = container.getAttribute('data-slide-direction');
      const dataAutoSlide = container.hasAttribute('data-slide-auto');
      const dataAutoSlideDelay = container.getAttribute('data-slide-auto-delay');
      // HTML에 data-slide-infinite가 있거나 옵션으로 들어오면 무한 모드 활성화
      const isInfinite = container.hasAttribute('data-slide-infinite') || options.infinite;
      const parsedGroupSize = dataGroupSize ? parseInt(dataGroupSize, 10) : 1;
      const dataPaginationMobile = container.getAttribute('data-slide-pagination-mobile');
      const dataPaginationOnly = container.getAttribute('data-slide-pagination-only');
      const dataGrab = container.getAttribute('data-slide-grab');
      
      // 이벤트 슬라이드인 경우 자동 설정
      if (isEventSlide) {
        defaultCardSelector = '.event-list__event-item';
      }
      
      this.options = {
        listSelector: options.listSelector || (isEventSlide ? '.event-area__event-list' : '[data-slide-list]'),
        prevBtnSelector: options.prevBtnSelector || '[data-slide-prev]',
        nextBtnSelector: options.nextBtnSelector || '[data-slide-next]',
        cardSelector: options.cardSelector || defaultCardSelector,
        breakpoint: options.breakpoint || 1024,
        threshold: options.threshold || 5,
        resizeDelay: options.resizeDelay || 100,
        groupSize: options.groupSize !== undefined ? options.groupSize : parsedGroupSize,
        pagination: options.pagination !== undefined ? options.pagination : (isEventSlide ? true : !!dataPagination),
        paginationSelector: options.paginationSelector || (isEventSlide ? '.event-area__pagination' : dataPagination) || null,
        paginationMobile: options.paginationMobile !== undefined
          ? options.paginationMobile
          : (dataPaginationMobile === 'true'),
        paginationOnly: options.paginationOnly !== undefined
          ? options.paginationOnly
          : (dataPaginationOnly === 'true'),
        // 그룹 모드이고 투명 카드 옵션이 명시되지 않은 경우 자동 활성화
        transparentCard: options.transparentCard !== undefined 
          ? options.transparentCard 
          : (parsedGroupSize > 1),
        transparentCardClass: options.transparentCardClass || 'schedule-card--transparent',
        maxPaginationDots: options.maxPaginationDots || 5,
        infinite: isInfinite, // 무한 슬라이드 옵션 추가
        direction: options.direction || dataDirection || (isEventSlide ? 'vertical' : 'horizontal'), // 수직/수평 방향
        autoSlide: options.autoSlide !== undefined ? options.autoSlide : (isEventSlide || dataAutoSlide), // 자동 롤링
        autoSlideDelay: options.autoSlideDelay || (dataAutoSlideDelay ? parseInt(dataAutoSlideDelay, 10) : 8000), // 자동 롤링 딜레이 (기본 8초)
        grab: options.grab !== undefined ? options.grab : dataGrab !== 'false',
      };

      // 요소 찾기
      this.cardList = this.container.querySelector(this.options.listSelector);
      
      // 버튼 찾기: 컨테이너 내부에서 먼저 찾기
      this.prevBtn = this.container.querySelector(this.options.prevBtnSelector);
      this.nextBtn = this.container.querySelector(this.options.nextBtnSelector);
      
      // 컨테이너 내부에 없으면 부모 요소들에서 찾기 (같은 섹션 내)
      if (!this.prevBtn || !this.nextBtn) {
        // 컨테이너의 가장 가까운 section 부모 찾기
        const sectionParent = this.container.closest('section');
        
        if (sectionParent) {
          // section 내의 모든 버튼 후보 찾기
          const allPrevBtns = sectionParent.querySelectorAll(this.options.prevBtnSelector);
          const allNextBtns = sectionParent.querySelectorAll(this.options.nextBtnSelector);
          
          // 컨테이너와 가장 가까운 버튼 선택
          // 버튼과 컨테이너의 공통 부모를 찾아서 가장 가까운 것 선택
          if (!this.prevBtn && allPrevBtns.length > 0) {
            this.prevBtn = this.findClosestButton(allPrevBtns);
          }
          
          if (!this.nextBtn && allNextBtns.length > 0) {
            this.nextBtn = this.findClosestButton(allNextBtns);
          }
        } else {
          // section이 없는 경우, 직접 부모에서 찾기
          let parent = this.container.parentElement;
          while (parent && parent !== document.body) {
            if (!this.prevBtn) {
              const foundPrev = parent.querySelector(this.options.prevBtnSelector);
              if (foundPrev && this.isButtonRelatedToContainer(foundPrev)) {
                this.prevBtn = foundPrev;
              }
            }
            if (!this.nextBtn) {
              const foundNext = parent.querySelector(this.options.nextBtnSelector);
              if (foundNext && this.isButtonRelatedToContainer(foundNext)) {
                this.nextBtn = foundNext;
              }
            }
            if (this.prevBtn && this.nextBtn) {
              break;
            }
            parent = parent.parentElement;
          }
        }
      }
      
      // 페이지네이션 컨테이너 찾기 (옵션이 활성화된 경우)
      this.paginationContainer = null;
      this.paginationDots = [];
      if (this.options.pagination && this.options.paginationSelector) {
        // 이벤트 슬라이드는 항상 컨테이너 내부에서만 찾기 (다른 슬라이드와 충돌 방지)
        if (isEventSlide) {
          this.paginationContainer = this.container.querySelector(this.options.paginationSelector);
        } else {
          // 1. 컨테이너 내부에서 먼저 찾기
          this.paginationContainer = this.container.querySelector(this.options.paginationSelector);
          
          // 2. 컨테이너 내부에 없으면 컨테이너의 부모 요소들에서 찾기 (같은 섹션 내)
          if (!this.paginationContainer) {
            let parent = this.container.parentElement;
            while (parent && parent !== document.body) {
              this.paginationContainer = parent.querySelector(this.options.paginationSelector);
              if (this.paginationContainer) {
                break;
              }
              parent = parent.parentElement;
            }
          }
          
          // 3. 여전히 없으면 전역에서 찾기 (하위 호환성)
          if (!this.paginationContainer) {
            this.paginationContainer = document.querySelector(this.options.paginationSelector);
          }
        }
      }
      // slide-page 페이지 표시 영역 찾기
      const sectionParentForTitle = this.container.closest('section');
      this.titleSide = sectionParentForTitle
        ? sectionParentForTitle.querySelector('.slide-page')
        : null;
      this.currentPageEl = this.titleSide ? this.titleSide.querySelector('.slide-page__current') : null;
      this.totalPageEl = this.titleSide ? this.titleSide.querySelector('.slide-page__total') : null;

      // 그룹 슬라이드 모드에서는 prev/next 버튼이 선택사항
      // 이벤트 슬라이드(수직)는 버튼이 없어도 됨
      const isGroupMode = this.options.groupSize > 1;
      const isVerticalSlide = this.options.direction === 'vertical' && this.options.pagination;
      const isPaginationOnly = this.options.pagination && this.options.paginationOnly;

      // 버튼 없이 동작 가능한 경우:
      // 1) 수직 이벤트 슬라이드
      // 2) pagination-only 슬라이드
      const canWorkWithoutButtons = isVerticalSlide || isPaginationOnly;

      // 기존 동작 유지하되, pagination-only면 버튼 필수 아님
      const requiresButtons = !canWorkWithoutButtons && (!isGroupMode || !this.options.pagination);

      // 요소가 없으면 초기화 중단
      if (!this.cardList || (!canWorkWithoutButtons && requiresButtons && (!this.prevBtn || !this.nextBtn))) {
        this.cardList = null;
        this.prevBtn = null;
        this.nextBtn = null;
        return;
      }

      // 카드 확인
      this.cards = this.cardList.querySelectorAll(this.options.cardSelector);
      if (this.cards.length === 0) {
        this.cardList = null;
        return;
      }

      // 드래그 관련 상태
      this.isDragging = false;
      this.startX = 0;
      this.scrollLeft = 0;
      
      // 그룹 슬라이드 관련 상태
      this.currentSlide = 0;
      this.scrollTimer = null;
      this.isScrolling = false;
      this.scrollCompleteTime = 0; // 스크롤 완료 시간 (타임스탬프)
      
      // 인스턴스 고유 ID (페이지네이션 구분용)
      this.instanceId = null;
      
      // 자동 롤링 관련 상태
      this.autoSlideInterval = null;
      this.isAnimating = false;

      // [무한 슬라이드] 1. 클론 생성 및 초기화
      if (this.options.infinite && window.innerWidth >= this.options.breakpoint) {
        this.initInfinite();
      } else if (this.options.transparentCard && this.options.groupSize > 1) {
        this.addTransparentCardIfNeeded();
      }

      // 이벤트 바인딩
      this.bindEvents();

      // 초기 상태 설정
      if (this.options.pagination) {
        if (isEventSlide) {
          this.initEventPagination();
        } else {
          this.createPaginationDots();
        }
      }

      this.updateButtonVisibility();
      
      // member-benefit-card인 경우 초기 활성 카드 설정
      this.updateActiveCard();
      
      this.updateTotalPageDisplay();
      this.updateCurrentPageDisplay();
      
      // [무한 슬라이드] 초기 위치 보정 (약간의 지연 후 실행하여 레이아웃 안정화 대기)
      if (this.options.infinite && window.innerWidth >= this.options.breakpoint) {
        setTimeout(() => this.jumpToRealSlide(0, false), 50);
      }
      
      // 자동 롤링 시작
      if (this.options.autoSlide) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this.startAutoSlide();
          });
        });
      }

      // 리사이즈 타이머
      this.resizeTimer = null;
    }

    /**
     * 버튼 목록에서 컨테이너와 가장 가까운 버튼 찾기
     * @param {NodeList|Array} buttons - 버튼 후보 목록
     * @returns {HTMLElement|null} 가장 가까운 버튼
     */
    findClosestButton(buttons) {
      let closestBtn = null;
      let minDistance = Infinity;
      
      Array.from(buttons).forEach(btn => {
        // 버튼과 컨테이너의 공통 부모 찾기
        const commonParent = this.findCommonParent(btn, this.container);
        if (!commonParent) return;
        
        // DOM 트리상 거리 계산 (공통 부모까지의 깊이 합)
        const btnDepth = this.getDepth(btn, commonParent);
        const containerDepth = this.getDepth(this.container, commonParent);
        const distance = btnDepth + containerDepth;
        
        // 컨테이너의 형제 요소이거나 직계 부모의 자식인 경우 우선 선택
        const btnParent = btn.parentElement;
        const containerParent = this.container.parentElement;
        
        // 같은 부모를 공유하는 경우 (형제 관계) 우선순위 높음
        if (btnParent === containerParent) {
          if (distance < minDistance) {
            minDistance = distance;
            closestBtn = btn;
          }
        } else if (distance < minDistance) {
          minDistance = distance;
          closestBtn = btn;
        }
      });
      
      return closestBtn || (buttons.length > 0 ? buttons[0] : null);
    }

    /**
     * 두 요소의 공통 부모 찾기
     * @param {HTMLElement} el1 - 첫 번째 요소
     * @param {HTMLElement} el2 - 두 번째 요소
     * @returns {HTMLElement|null} 공통 부모
     */
    findCommonParent(el1, el2) {
      const parents1 = [];
      let current = el1;
      while (current && current !== document.body) {
        parents1.push(current);
        current = current.parentElement;
      }
      
      current = el2;
      while (current && current !== document.body) {
        if (parents1.includes(current)) {
          return current;
        }
        current = current.parentElement;
      }
      
      return null;
    }

    /**
     * 요소에서 목표 부모까지의 깊이 계산
     * @param {HTMLElement} element - 시작 요소
     * @param {HTMLElement} targetParent - 목표 부모
     * @returns {number} 깊이
     */
    getDepth(element, targetParent) {
      let depth = 0;
      let current = element;
      while (current && current !== targetParent && current !== document.body) {
        depth++;
        current = current.parentElement;
      }
      return depth;
    }

    /**
     * 버튼이 이 컨테이너와 관련이 있는지 확인
     * @param {HTMLElement} button - 확인할 버튼 요소
     * @returns {boolean} 관련이 있으면 true
     */
    isButtonRelatedToContainer(button) {
      // (다른 슬라이드가 같은 페이지에 있을 때 잘못 매칭되어 인라인 display:none이 박히는 문제 방지)
      const nearestSlideContainer = button.closest('[data-slide-container]');
      if (nearestSlideContainer && nearestSlideContainer !== this.container) {
        return false;
      }
      if (!nearestSlideContainer && !this.container.contains(button)) {
        return false;
      }

      // 버튼과 컨테이너가 같은 section 내에 있는지 확인
      const buttonSection = button.closest('section');
      const containerSection = this.container.closest('section');
      
      if (buttonSection && containerSection) {
        return buttonSection === containerSection;
      }
      
      // section이 없는 경우, 가장 가까운 공통 부모 확인
      const commonParent = this.findCommonParent(button, this.container);
      if (!commonParent) return false;
      
      // 공통 부모가 너무 멀면 (body에 가까우면) 관련 없음
      const buttonDepth = this.getDepth(button, commonParent);
      const containerDepth = this.getDepth(this.container, commonParent);
      
      // 깊이 합이 5 이하이면 관련 있다고 판단
      return (buttonDepth + containerDepth) <= 5;
    }

    /**
     * 스크롤 위치 가져오기 (수직/수평 지원)
     * @returns {number} 스크롤 위치
     */
    getScrollPosition() {
      if (!this.cardList) return 0;
      return this.options.direction === 'vertical' 
        ? this.cardList.scrollTop 
        : this.cardList.scrollLeft;
    }

    /**
     * 스크롤 위치 설정 (수직/수평 지원)
     * @param {number} position - 스크롤 위치
     * @param {string} behavior - 스크롤 동작 ('auto' | 'smooth')
     */
    setScrollPosition(position, behavior = 'smooth') {
      if (!this.cardList) return;
      if (this.options.direction === 'vertical') {
        this.cardList.scrollTo({
          top: position,
          behavior: behavior
        });
      } else {
        this.cardList.scrollTo({
          left: position,
          behavior: behavior
        });
      }
    }

    /**
     * slide group단위 스냅
     */
    snapToNearestGroup() {
      if (!this.cardList) return false;

      const isDesktop = window.innerWidth >= this.options.breakpoint;
      if (!isDesktop || this.options.groupSize <= 1) return false;
      if (this.options.direction !== 'horizontal') return false;

      const totalSlides = this.getTotalSlides();
      if (totalSlides <= 0) return false;

      const slideWidth = this.getSlideWidth();
      if (!slideWidth) return false;

      const currentScroll = this.cardList.scrollLeft;
      const targetSlide = Math.max(
        0,
        Math.min(Math.round(currentScroll / slideWidth), totalSlides - 1)
      );
      const maxScroll = Math.max(0, this.cardList.scrollWidth - this.cardList.clientWidth);
      const targetScroll = Math.min(targetSlide * slideWidth, maxScroll);

      if (Math.abs(targetScroll - currentScroll) <= 1) {
        this.currentSlide = targetSlide;
        this.updatePagination();
        this.updateCurrentPageDisplay();
        return false;
      }

      this.currentSlide = targetSlide;
      this.updatePagination();
      this.updateCurrentPageDisplay();

      this.isScrolling = true;
      this.cardList.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      });
      this.waitForScrollComplete();

      return true;
    }

    /**
     * 카드 너비 + gap 계산
     * @returns {number} 카드 너비 + gap
     */
    getCardWidth() {
      const firstCard = this.cards[0];
      if (!firstCard) return 0;

      const cardSize = this.options.direction === 'vertical' 
        ? firstCard.offsetHeight 
        : firstCard.offsetWidth;
      const gap = parseInt(window.getComputedStyle(this.cardList).gap) || 0;
      return cardSize + gap;
    }

    /**
     * 슬라이드 너비 계산 (그룹 모드)
     * @returns {number} 슬라이드 너비
     */
    getSlideWidth() {
      const isDesktop = window.innerWidth >= this.options.breakpoint;
      const firstCard = this.cards[0];
      if (!firstCard) return 0;

      const cardSize = this.options.direction === 'vertical'
        ? firstCard.offsetHeight
        : firstCard.offsetWidth;

      const styles = window.getComputedStyle(this.cardList);
      const gap = parseInt(styles.columnGap || styles.gap, 10) || 0;

      if (isDesktop && this.options.groupSize > 1) {
        return (cardSize * this.options.groupSize) + (gap * (this.options.groupSize - 1));
      }

      return cardSize + gap;
    }

    /**
     * 특정 슬라이드의 시작 인덱스 계산
     * @param {number} slideIndex - 슬라이드 인덱스
     * @returns {number} 카드 시작 인덱스
     */
    getSlideStartIndex(slideIndex) {
      if (this.options.infinite) return slideIndex; // 무한 모드에서는 1:1 매핑
      const isDesktop = window.innerWidth >= this.options.breakpoint;
      if (isDesktop && this.options.groupSize > 1) {
        return slideIndex * this.options.groupSize;
      } else {
        return slideIndex;
      }
    }

    /**
     * 총 슬라이드 수 계산
     * @returns {number} 총 슬라이드 수
     */
    getTotalSlides() {
      // 이벤트 슬라이드(수직)는 카드 개수 그대로 사용
      if (this.options.direction === 'vertical' && this.options.autoSlide) {
        return this.cards.length;
      }
      
      // 무한 모드에서는 실제 원본 카드 개수를 기준으로 계산
      let selector = this.options.cardSelector;
      if (this.options.infinite) {
        selector += ':not(.is-clone)';
      } else {
        selector += `:not(.${this.options.transparentCardClass})`;
      }
      
      const realCards = this.cardList.querySelectorAll(selector);
      
      // 카드가 그룹 크기 이하(한 묶음)인 경우 페이지네이션 없음
      if (realCards.length <= this.options.groupSize) {
        return 0;
      }
      
      const isDesktop = window.innerWidth >= this.options.breakpoint;
      if (isDesktop && this.options.groupSize > 1) {
        // PC: 그룹 단위로 페이지네이션
        const totalSlides = Math.ceil(realCards.length / this.options.groupSize);
        return Math.min(totalSlides, this.options.maxPaginationDots);
      } else {
        // 모바일: 실제 카드 수만큼 (최대 제한)
        return Math.min(realCards.length, this.options.maxPaginationDots);
      }
    }

    /**
     * [무한 슬라이드] 클론 생성 및 배치
     */
    initInfinite() {
      // 기존 클론 제거
      const existingClones = this.cardList.querySelectorAll('.is-clone');
      existingClones.forEach(el => el.remove());

      const realCards = Array.from(this.cards).filter(card => !card.classList.contains('is-clone'));
      if (realCards.length < 2) return; // 카드가 너무 적으면 무한 스크롤 안함

      // 앞뒤에 붙일 개수 (그룹 사이즈만큼 혹은 여유있게)
      const cloneCount = Math.max(this.options.groupSize, 2); 

      // 1. 뒤에 붙일 클론 (앞쪽 카드들을 복사)
      const clonesAfter = realCards.slice(0, cloneCount).map(card => {
        const clone = card.cloneNode(true);
        clone.classList.add('is-clone');
        clone.setAttribute('aria-hidden', 'true');
        return clone;
      });

      // 2. 앞에 붙일 클론 (뒤쪽 카드들을 복사)
      const clonesBefore = realCards.slice(-cloneCount).map(card => {
        const clone = card.cloneNode(true);
        clone.classList.add('is-clone');
        clone.setAttribute('aria-hidden', 'true');
        return clone;
      });

      // DOM에 추가
      this.cardList.prepend(...clonesBefore);
      this.cardList.append(...clonesAfter);
      
      // 카드 목록 업데이트
      this.cards = this.cardList.querySelectorAll(this.options.cardSelector);
    }

    /**
     * 홀수 개일 때 투명 카드 추가 (PC에서만)
     */
    addTransparentCardIfNeeded() {
      if (!this.options.transparentCard || this.options.groupSize <= 1) return;
      
      const isDesktop = window.innerWidth >= this.options.breakpoint;
      if (!isDesktop) {
        // 모바일에서는 투명 카드 제거
        const existingTransparent = this.cardList.querySelector(`.${this.options.transparentCardClass}`);
        if (existingTransparent) {
          existingTransparent.remove();
        }
        return;
      }
      
      // 실제 카드만 필터링 (투명 카드 제외)
      const realCards = this.cardList.querySelectorAll(
        `${this.options.cardSelector}:not(.${this.options.transparentCardClass})`
      );
      
      // 홀수 개이고 그룹 크기 초과인 경우 투명 카드 추가
      if (realCards.length > this.options.groupSize && realCards.length % this.options.groupSize !== 0) {
        // 기존 투명 카드 제거
        const existingTransparent = this.cardList.querySelector(`.${this.options.transparentCardClass}`);
        if (existingTransparent) {
          existingTransparent.remove();
        }
        
        // 새로운 투명 카드 추가
        const transparentCard = document.createElement('article');
        transparentCard.className = `${this.options.cardSelector.replace('.', '')} ${this.options.transparentCardClass}`;
        transparentCard.setAttribute('aria-hidden', 'true');
        this.cardList.appendChild(transparentCard);
      } else {
        // 짝수이거나 그룹 크기 이하인 경우 투명 카드 제거
        const existingTransparent = this.cardList.querySelector(`.${this.options.transparentCardClass}`);
        if (existingTransparent) {
          existingTransparent.remove();
        }
      }
      
      // 카드 목록 업데이트
      this.cards = this.cardList.querySelectorAll(this.options.cardSelector);
    }

    /**
     * 스크롤 위치 확인 및 버튼 표시/숨김
     */
    updateButtonVisibility() {
      if (!this.cardList || !this.prevBtn || !this.nextBtn) return;

      if (this.options.infinite && window.innerWidth >= this.options.breakpoint) {
        this.prevBtn.style.display = 'flex';
        this.nextBtn.style.display = 'flex';
        return;
      }

      if (window.innerWidth < this.options.breakpoint) {
        this.prevBtn.style.display = 'none';
        this.nextBtn.style.display = 'none';
        return;
      }

      const scrollLeft = this.cardList.scrollLeft;
      const maxScroll = Math.max(0, this.cardList.scrollWidth - this.cardList.clientWidth);
      const threshold = this.options.threshold;

      const isAtStart = scrollLeft <= threshold;
      const isAtEnd = scrollLeft >= maxScroll - threshold;

      this.prevBtn.style.display = isAtStart ? 'none' : 'flex';
      this.nextBtn.style.display = isAtEnd ? 'none' : 'flex';
    }

    /**
     * 다음 카드로 이동
     * @param {Event} e - 이벤트 객체
     */
    scrollNext(e) {
      if (e) {
        e.preventDefault();
      }

      if (!this.cardList) return;

      const slideWidth = this.getSlideWidth();
      if (slideWidth === 0) return;

      // 무한 모드 로직
      if (this.options.infinite && window.innerWidth >= this.options.breakpoint) {
        const currentScroll = this.cardList.scrollLeft;
        const targetScroll = currentScroll + slideWidth;

        this.isScrolling = true;

        this.cardList.scrollTo({
          left: targetScroll,
          behavior: 'smooth'
        });

        this.waitForScrollComplete();
        return;
      }

      // 그룹 모드인 경우
      if (this.options.groupSize > 1) {
        const totalSlides = this.getTotalSlides();
        if (totalSlides > 0) {
          const nextSlide = Math.min(this.currentSlide + 1, totalSlides - 1);
          this.goToSlide(nextSlide);
        } else {
          // 일반 모드로 동작
          const currentScroll = this.cardList.scrollLeft;
          const targetScroll = currentScroll + slideWidth;
          
          // 프로그래밍 방식 스크롤 시작 플래그 설정
          this.isScrolling = true;
          this.scrollCompleteTime = 0;
          
          this.cardList.scrollTo({
            left: targetScroll,
            behavior: 'smooth',
          });
          
          // 스크롤 완료 대기
          this.waitForScrollComplete();
        }
        return;
      }

      // 일반 모드
      const cardWidth = this.getCardWidth();
      const currentScroll = this.cardList.scrollLeft;
      const scrollWidth = this.cardList.scrollWidth;
      const clientWidth = this.cardList.clientWidth;
      const maxScroll = Math.max(0, scrollWidth - clientWidth);
      
      // 최대 스크롤 범위를 초과하지 않도록 제한
      let targetScroll = currentScroll + cardWidth;
      if (targetScroll > maxScroll) {
        targetScroll = maxScroll;
      }
      if (currentScroll >= maxScroll - this.options.threshold) {
        this.updateButtonVisibility();
        return;
      }

      // **[수정됨] 끝 지점 도달 문제 해결**
      if (targetScroll !== maxScroll && (targetScroll - currentScroll <= this.options.threshold)) {
        return;
      }

      // 프로그래밍 방식 스크롤 시작 플래그 설정
      this.isScrolling = true;
      this.scrollCompleteTime = 0; // 스크롤 완료 시간 초기화

      this.cardList.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      });
      
      // 스크롤 완료 대기
      this.waitForScrollComplete();
    }

    /**
     * 이전 카드로 이동
     * @param {Event} e - 이벤트 객체
     */
    scrollPrev(e) {
      if (e) {
        e.preventDefault();
      }

      if (!this.cardList) return;

      const slideWidth = this.getSlideWidth();
      if (slideWidth === 0) return;

      // 무한 모드 로직
      if (this.options.infinite && window.innerWidth >= this.options.breakpoint) {
        const realCards = this.cardList.querySelectorAll(`${this.options.cardSelector}:not(.is-clone)`);
        if (!realCards.length) return;

        const nextIndex = (this.currentSlide + 1) % realCards.length;
        const targetCard = realCards[nextIndex];

        this.currentSlide = nextIndex;
        this.updateCurrentPageDisplay();

        this.isScrolling = true;

        this.cardList.scrollTo({
          left: targetCard.offsetLeft,
          behavior: 'smooth'
        });

        this.waitForScrollComplete();
        return;
      }

      // 그룹 모드인 경우
      if (this.options.groupSize > 1) {
        const totalSlides = this.getTotalSlides();
        if (totalSlides > 0) {
          const prevSlide = Math.max(this.currentSlide - 1, 0);
          this.goToSlide(prevSlide);
        } else {
          // 일반 모드로 동작
          const currentScroll = this.cardList.scrollLeft;
          const targetScroll = Math.max(0, currentScroll - slideWidth);
          
          // 프로그래밍 방식 스크롤 시작 플래그 설정
          this.isScrolling = true;
          this.scrollCompleteTime = 0;
          
          this.cardList.scrollTo({
            left: targetScroll,
            behavior: 'smooth',
          });
          
          // 스크롤 완료 대기
          this.waitForScrollComplete();
        }
        return;
      }

      // 일반 모드
      const cardWidth = this.getCardWidth();
      const currentScroll = this.cardList.scrollLeft;
      const targetScroll = Math.max(0, currentScroll - cardWidth);

      // 프로그래밍 방식 스크롤 시작 플래그 설정
      this.isScrolling = true;
      this.scrollCompleteTime = 0; // 스크롤 완료 시간 초기화

      this.cardList.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      });
      
      // 스크롤 완료 대기
      this.waitForScrollComplete();
    }

    /**
     * 특정 슬라이드로 이동
     * @param {number} slideIndex - 슬라이드 인덱스
     */
    goToSlide(slideIndex) {
      // 이벤트 슬라이드(수직) 처리
      if (this.options.direction === 'vertical' && this.options.autoSlide) {
        this.goToEventSlide(slideIndex);
        return;
      }
      
      /* 기존 로직과 유사하지만 무한 모드 대응 */
      if (this.options.infinite && window.innerWidth >= this.options.breakpoint) {
        this.jumpToRealSlide(slideIndex, true); // true = smooth
        return;
      }
      
      const totalSlides = this.getTotalSlides();
      
      if (totalSlides <= 0) {
        return;
      }
      
      this.currentSlide = Math.max(0, Math.min(slideIndex, totalSlides - 1));
      this.updateCurrentPageDisplay();
      
      const allCards = this.cardList.querySelectorAll(this.options.cardSelector);
      
      if (allCards.length === 0) {
        return;
      }
      
      const startIndex = this.getSlideStartIndex(this.currentSlide);
      const targetCard = allCards[startIndex];
      
      if (!targetCard) {
        if (this.options.pagination) {
          this.updatePagination();
        }
        return;
      }
      
      // 첫 번째 카드 기준으로 상대 위치 계산 (더 정확함)
      const firstCard = allCards[0];
      const firstCardPos = this.options.direction === 'vertical' 
        ? firstCard.offsetTop 
        : firstCard.offsetLeft;
      const targetCardPos = this.options.direction === 'vertical' 
        ? targetCard.offsetTop 
        : targetCard.offsetLeft;
      const maxScroll = Math.max(0, this.cardList.scrollWidth - this.cardList.clientWidth);
      const targetScroll = Math.min(targetCardPos - firstCardPos, maxScroll);
      
      // 스크롤 시작 플래그 설정
      this.isScrolling = true;
      
      // 즉시 페이지네이션 업데이트
      if (this.options.pagination) {
        this.updatePagination();
      }
      
      this.setScrollPosition(targetScroll, 'smooth');
      this.waitForScrollComplete();

      if (this.options.autoSlide) {
        this.restartAutoSlide();
      }
    }
    
    /**
     * 이벤트 슬라이드(수직)로 이동
     * @param {number} slideIndex - 슬라이드 인덱스
     */
    goToEventSlide(slideIndex) {
      if (this.isAnimating) return;
      
      const totalSlides = this.getTotalSlides();
      if (slideIndex < 0 || slideIndex >= totalSlides) return;
      
      this.isAnimating = true;
      this.isScrolling = true; // 프로그래밍 방식 스크롤 표시
      this.currentSlide = slideIndex;

      this.updateCurrentPageDisplay();
      
      const targetItem = this.cards[slideIndex];
      if (!targetItem) {
        this.isAnimating = false;
        this.isScrolling = false;
        return;
      }
      
      const itemHeight = targetItem.offsetHeight;
      const targetScroll = slideIndex * itemHeight;
      
      // 활성 도트 변경 (먼저 업데이트)
      this.updateEventPagination();
      
      // 수직 스크롤 이동
      this.setScrollPosition(targetScroll, 'smooth');
      
      // 자동 롤링 재시작
      this.restartAutoSlide();
      
      // 애니메이션 완료 대기
      setTimeout(() => {
        this.isAnimating = false;
        this.isScrolling = false;
        // 스크롤 완료 후 다시 한번 페이지네이션 확인
        this.updateEventPagination();
      }, 400);
    }

    /**
     * [무한 슬라이드] 특정 인덱스의 '진짜' 카드 위치로 이동 (순간이동 포함)
     * @param {number} realIndex - 실제 카드 인덱스
     * @param {boolean} smooth - 부드러운 스크롤 여부
     */
    jumpToRealSlide(realIndex, smooth = false) {
      const realCards = this.cardList.querySelectorAll(`${this.options.cardSelector}:not(.is-clone)`);
      if (!realCards[realIndex]) return;

      const targetCard = realCards[realIndex];
      // 첫 번째 클론(혹은 전체 리스트 시작) 기준이 아니라, 스크롤 컨테이너 기준 offsetLeft가 필요
      // 하지만 offsetLeft는 부모 기준이므로, 안전하게 계산
      
      const targetLeft = targetCard.offsetLeft;
      
      // 현재 gap 계산
      const gap = parseInt(window.getComputedStyle(this.cardList).gap) || 0;
      
      // 중앙 정렬이 아니므로 그냥 offsetLeft로 이동
      // 만약 '중앙 정렬'을 원하면: targetLeft - (containerWidth/2) + (cardWidth/2)
      
      this.isScrolling = true;
      this.cardList.scrollTo({
        left: targetLeft,
        behavior: smooth ? 'smooth' : 'auto' // smooth 여부 결정
      });
      
      if (smooth) {
        this.waitForScrollComplete();
      } else {
        this.isScrolling = false;
        this.currentSlide = realIndex;
        this.updateCurrentPageDisplay();
        this.updateActiveCard();
      }
    }
    
    /**
     * 스크롤 완료 대기 및 현재 슬라이드 재계산
     */
    waitForScrollComplete() {
      // 기존 로직과 동일하되, 완료 시 onScrollComplete 호출
      let lastScrollPos = this.getScrollPosition();
      let scrollEndCount = 0;
      const maxScrollEndCount = 3; // 연속 3번 같은 위치면 완료로 간주
      
      const checkScrollComplete = () => {
        const currentScrollPos = this.getScrollPosition();
        if (Math.abs(currentScrollPos - lastScrollPos) < 1) {
          scrollEndCount++;
          if (scrollEndCount >= maxScrollEndCount) {
            this.isScrolling = false;
            this.scrollCompleteTime = Date.now();
            this.onScrollComplete(); // 분리된 완료 핸들러 호출
            return;
          }
        } else {
          scrollEndCount = 0;
          lastScrollPos = currentScrollPos;
        }
        if (this.isScrolling) requestAnimationFrame(checkScrollComplete);
      };
      
      setTimeout(() => { if (this.isScrolling) requestAnimationFrame(checkScrollComplete); }, 50);
      
      clearTimeout(this.scrollTimer);
      this.scrollTimer = setTimeout(() => {
        if (this.isScrolling) {
          this.isScrolling = false;
          this.onScrollComplete();
        }
      }, 600); // 1000ms -> 600ms로 단축 (반응성 향상)
    }

    /**
     * 스크롤 완료 후 실행되는 로직 (텔레포트 핵심)
     */
    onScrollComplete() {
      // 이벤트 슬라이드(수직)는 기존 로직 유지
      if (this.options.direction === 'vertical' && this.options.autoSlide) {
        this.isScrolling = false;
        return;
      }

      // infinite 아닌 일반 그룹 슬라이드
      if (!this.options.infinite) {
        const snapped = this.snapToNearestGroup();
        if (snapped) return;

        this.calculateCurrentSlide();
        this.updateButtonVisibility();
        return;
      }

      // 이하 infinite 기존 로직 유지
      if (this.options.direction === 'vertical') {
        this.calculateCurrentSlide();
        return;
      }

      const scrollLeft = this.cardList.scrollLeft;
      const realCards = this.cardList.querySelectorAll(`${this.options.cardSelector}:not(.is-clone)`);
      if (realCards.length === 0) return;

      const firstReal = realCards[0];
      const lastReal = realCards[realCards.length - 1];
      const cardWidth = this.getCardWidth();

      if (scrollLeft < firstReal.offsetLeft - cardWidth) {
        this.cardList.scrollTo({
          left: lastReal.offsetLeft,
          behavior: 'auto'
        });
      } else if (scrollLeft > lastReal.offsetLeft + cardWidth) {
        this.cardList.scrollTo({
          left: firstReal.offsetLeft,
          behavior: 'auto'
        });
      }

      this.calculateCurrentSlide();
      this.updateButtonVisibility();
      this.updateActiveCard();
      this.updateCurrentPageDisplay();
    }

    /**
     * 페이지네이션 도트 생성
     */
    createPaginationDots() {
      if (this.options.direction === 'vertical' && this.options.autoSlide) return;
      if (!this.paginationContainer) return;
      
      // 기존 도트 제거 (다른 인스턴스가 생성한 도트가 있을 수 있으므로 확인)
      // 이 인스턴스가 생성한 도트만 제거
      const existingDots = this.paginationContainer.querySelectorAll('.schedule-section__pagination-dot');
      existingDots.forEach(dot => {
        // 이 인스턴스가 생성한 도트인지 확인 (data-slide-instance 속성으로)
        if (dot.hasAttribute('data-slide-instance-id')) {
          const instanceId = dot.getAttribute('data-slide-instance-id');
          if (instanceId === this.instanceId) {
            dot.remove();
          }
        } else {
          // 기존 도트는 모두 제거 (하위 호환성)
          dot.remove();
        }
      });
      
      this.paginationDots = [];
      
      const totalSlides = this.getTotalSlides();
      const isDesktop = window.innerWidth >= this.options.breakpoint;
      
      // 카드가 1개 이하이거나 슬라이드가 없는 경우, 또는 모바일인 경우 페이지네이션 숨김
      if (totalSlides <= 0 || (!isDesktop && !this.options.paginationMobile)) {
        this.paginationContainer.style.display = 'none';
        return;
      }
      
      // PC에서만 페이지네이션 표시
      this.paginationContainer.style.display = '';
      
      // 인스턴스 고유 ID 생성 (없으면 생성)
      if (!this.instanceId) {
        this.instanceId = `slide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // 도트 생성 (최대 제한)
      for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'schedule-section__pagination-dot';
        dot.setAttribute('aria-label', `슬라이드 ${i + 1}`);
        dot.setAttribute('data-slide', i);
        dot.setAttribute('data-slide-instance-id', this.instanceId); // 인스턴스 식별자 추가
        
        // 클릭 이벤트 - 이 인스턴스에만 바인딩
        dot.addEventListener('click', (e) => {
          e.stopPropagation(); // 이벤트 전파 방지
          this.goToSlide(i);
        });
        
        this.paginationContainer.appendChild(dot);
        this.paginationDots.push(dot);
      }
      
      this.updatePagination();
    }

    /**
     * 페이지네이션 업데이트
     */
    updatePagination() {
      // 이벤트 슬라이드인 경우 별도 처리
      if (this.options.direction === 'vertical' && this.options.autoSlide) {
        this.updateEventPagination();
        return;
      }
      
      // 이 인스턴스가 생성한 도트만 업데이트
      this.paginationDots.forEach((dot, index) => {
        // 인스턴스 ID 확인 (안전장치)
        if (this.instanceId && dot.getAttribute('data-slide-instance-id') !== this.instanceId) {
          return; // 다른 인스턴스의 도트는 건너뛰기
        }
        
        if (index === this.currentSlide) {
          dot.classList.add('is-active');
          dot.setAttribute('aria-current', 'true');
        } else {
          dot.classList.remove('is-active');
          dot.removeAttribute('aria-current');
        }
      });
    }
    
    /**
     * 이벤트 슬라이드 페이지네이션 초기화
     */
    initEventPagination() {
      if (!this.paginationContainer) return;
      
      // 자신의 컨테이너 내부의 페이지네이션만 찾기 (다른 슬라이드와 충돌 방지)
      const containerPagination = this.container.querySelector('.event-area__pagination');
      if (!containerPagination) return;

      containerPagination
        .querySelectorAll('.schedule-section__pagination-dot')
        .forEach((dot) => dot.remove());
      
      this.paginationDots = Array.from(containerPagination.querySelectorAll('.event-area__pagination-dot'));
      
      if (this.paginationDots.length === 0) return;
      
      // 각 도트에 클릭 이벤트 바인딩 (기존 이벤트 제거 후 추가)
      this.paginationDots.forEach((dot, index) => {
        // 기존 클릭 이벤트 제거를 위해 새 함수 참조 저장
        const clickHandler = () => {
          this.goToEventSlide(index);
        };
        // 이전 핸들러가 있다면 제거
        if (dot._slideClickHandler) {
          dot.removeEventListener('click', dot._slideClickHandler);
        }
        dot._slideClickHandler = clickHandler;
        dot.addEventListener('click', clickHandler);
      });
      
      // 초기 활성화
      this.updateEventPagination();
    }
    
    /**
     * 이벤트 슬라이드 페이지네이션 업데이트
     */
    updateEventPagination() {
      if (!this.paginationDots || this.paginationDots.length === 0) {
        // paginationDots가 없으면 다시 초기화 시도
        this.initEventPagination();
        return;
      }
      
      // 자신의 컨테이너 내부의 페이지네이션만 업데이트
      const containerPagination = this.container.querySelector('.event-area__pagination');
      if (!containerPagination) return;
      
      // 현재 컨테이너의 도트만 필터링 (다른 슬라이드 도트 제외)
      const currentDots = Array.from(containerPagination.querySelectorAll('.event-area__pagination-dot'));
      
      currentDots.forEach((dot, index) => {
        if (index === this.currentSlide) {
          dot.classList.add('is-active');
          dot.setAttribute('aria-current', 'true');
        } else {
          dot.classList.remove('is-active');
          dot.removeAttribute('aria-current');
        }
      });
      
      // paginationDots도 업데이트
      this.paginationDots = currentDots;
    }
    
    /**
     * 자동 롤링 시작
     */
    startAutoSlide() {
      if (!this.options.autoSlide) return;
      
      this.stopAutoSlide();
      this.autoSlideInterval = setInterval(() => {
        if (!this.isAnimating && !this.isScrolling) {
          this.goToNextAuto();
        }
      }, this.options.autoSlideDelay);
    }
    
    /**
     * 자동 롤링 중지
     */
    stopAutoSlide() {
      if (this.autoSlideInterval) {
        clearInterval(this.autoSlideInterval);
        this.autoSlideInterval = null;
      }
    }
    
    /**
     * 자동 롤링 재시작
     */
    restartAutoSlide() {
      this.stopAutoSlide();
      this.startAutoSlide();
    }
    
    /**
     * 자동 롤링 다음으로 이동
     */
    goToNextAuto() {
      if (this.options.direction === 'vertical' && this.options.autoSlide) {
        const nextIndex = (this.currentSlide + 1) % this.cards.length;
        this.goToEventSlide(nextIndex);
        return;
      }

      const totalSlides = this.getTotalSlides();

      if (totalSlides > 0) {
        const nextIndex = (this.autoLoopIndex + 1) % totalSlides;

        const allCards = this.cardList.querySelectorAll(this.options.cardSelector);
        const startIndex = this.getSlideStartIndex(nextIndex);
        const targetCard = allCards[startIndex];
        const firstCard = allCards[0];

        if (!targetCard || !firstCard) return;

        const maxScroll = Math.max(0, this.cardList.scrollWidth - this.cardList.clientWidth);
        const targetScroll = Math.min(
          targetCard.offsetLeft - firstCard.offsetLeft,
          maxScroll
        );

        this.autoLoopIndex = nextIndex;
        this.currentSlide = nextIndex;

        this.updatePagination();
        this.updateCurrentPageDisplay();

        this.isScrolling = true;
        this.scrollCompleteTime = 0;

        this.cardList.scrollTo({
          left: targetScroll,
          behavior: 'smooth',
        });

        this.waitForScrollComplete();

        return;
      }

      this.scrollNext();
    }

    /**
     * 현재 슬라이드 인덱스 계산
     */
    calculateCurrentSlide() {
      // 이벤트 슬라이드(수직)는 별도 처리하지 않음
      if (this.options.direction === 'vertical' && this.options.autoSlide) {
        return;
      }
      
      // 무한 모드일 때 인덱스 계산 (클론 무시하고 진짜 카드 기준)
      const scrollPos = this.getScrollPosition();
      const allCards = this.cardList.querySelectorAll(this.options.cardSelector);
      
      let minDistance = Infinity;
      let closestCardIndex = 0;

      allCards.forEach((card, index) => {
        const cardPos = this.options.direction === 'vertical' 
          ? card.offsetTop 
          : card.offsetLeft;
        const dist = Math.abs(cardPos - scrollPos);
        if (dist < minDistance) {
          minDistance = dist;
          closestCardIndex = index;
        }
      });

      // 가장 가까운 카드가 클론인지 확인
      const closestCard = allCards[closestCardIndex];
      let realIndex = 0;
      
      if (this.options.infinite && closestCard.classList.contains('is-clone')) {
        // 클론이면 원본을 찾아 인덱스 매핑
        const realCards = this.cardList.querySelectorAll(`${this.options.cardSelector}:not(.is-clone)`);
        // 클론의 위치를 기반으로 실제 인덱스 추정
        const realCardsArray = Array.from(realCards);
        realCardsArray.forEach((card, i) => {
          const dist = Math.abs(card.offsetLeft - scrollPos);
          if (dist < minDistance) {
            minDistance = dist;
            realIndex = i;
          }
        });
      } else {
        // 진짜 카드 중에서 몇 번째인지 찾기
        const isDesktop = window.innerWidth >= this.options.breakpoint;
        
        if (this.options.infinite) {
          const realCards = this.cardList.querySelectorAll(`${this.options.cardSelector}:not(.is-clone)`);
          realCards.forEach((card, i) => {
            if (card === closestCard) realIndex = i;
          });
        } else if (isDesktop && this.options.groupSize > 1) {
          // PC: 그룹 단위로 슬라이드 인덱스 계산
          let leftmostCardIndex = 0;
          let minDist = Infinity;
          
          allCards.forEach((card, index) => {
            const cardRelativeLeft = card.offsetLeft;
            const distance = cardRelativeLeft - scrollPos;
            
            if (distance >= -this.options.threshold) {
              if (distance < minDist) {
                minDist = distance;
                leftmostCardIndex = index;
              }
            }
          });
          
          if (minDist === Infinity) {
            leftmostCardIndex = allCards.length - 1;
            for (let i = allCards.length - 1; i >= 0; i--) {
              const cardRelativeLeft = allCards[i].offsetLeft;
              if (cardRelativeLeft <= scrollPos + this.options.threshold) {
                leftmostCardIndex = i;
                break;
              }
            }
          }
          
          realIndex = Math.floor(leftmostCardIndex / this.options.groupSize);
        } else {
          // 모바일: 투명 카드 제외한 실제 카드 인덱스 계산
          let visibleCardIndex = 0;
          let minDist = Infinity;
          
          allCards.forEach((card, index) => {
            const cardLeft = card.offsetLeft;
            const distance = Math.abs(cardLeft - scrollPos);
            
            if (distance < minDist) {
              minDist = distance;
              visibleCardIndex = index;
            }
          });
          
          const realCards = this.cardList.querySelectorAll(
            `${this.options.cardSelector}:not(.${this.options.transparentCardClass})`
          );
          let count = 0;
          for (let i = 0; i <= visibleCardIndex; i++) {
            if (!allCards[i].classList.contains(this.options.transparentCardClass)) {
              count++;
            }
          }
          realIndex = count - 1;
        }
      }

      this.currentSlide = realIndex;
      const totalSlides = this.getTotalSlides();
      this.currentSlide = Math.max(0, Math.min(this.currentSlide, totalSlides - 1));
      this.autoLoopIndex = this.currentSlide;
      
      if (this.options.pagination) {
        this.updatePagination();
      }
      
      this.updateCurrentPageDisplay();
      
      // member-benefit-card에 is-active 클래스 추가/제거
      this.updateActiveCard();
    }
    
    /**
     * 현재 보이는 카드에 is-active 클래스 추가
     */
    updateActiveCard() {
      // 무한 모드에서는 '화면 중앙'에 있는 카드를 Active로 간주
      const allCards = this.cardList.querySelectorAll(this.options.cardSelector);
      if (allCards.length === 0) return;
      
      // member-benefit-card인 경우에만 처리
      const isBenefitCard = allCards[0].classList.contains('member-benefit-card');
      if (!isBenefitCard && !this.options.infinite) return;
      
      const scrollLeft = this.cardList.scrollLeft;
      const cardListLeft = this.cardList.getBoundingClientRect().left;
      const cardListWidth = this.cardList.clientWidth;
      const center = scrollLeft + (cardListWidth / 2);
      
      let activeCard = null;
      let minDist = Infinity;
      
      allCards.forEach(card => {
        // 클론은 제외하고 실제 카드만 고려
        if (this.options.infinite && card.classList.contains('is-clone')) {
          return;
        }
        
        const cardCenter = card.offsetLeft + (card.offsetWidth / 2);
        const dist = Math.abs(center - cardCenter);
        if (dist < minDist) {
          minDist = dist;
          activeCard = card;
        }
        card.classList.remove('is-active');
      });

      if (activeCard) {
        // 만약 activeCard가 클론이면, 원본 카드도 같이 active 시켜주는 것이 UX상 좋음
        activeCard.classList.add('is-active');
        
        // 무한 모드에서 클론이 활성화된 경우, 원본도 활성화
        if (this.options.infinite && activeCard.classList.contains('is-clone')) {
          const realCards = this.cardList.querySelectorAll(`${this.options.cardSelector}:not(.is-clone)`);
          // 클론의 내용을 기반으로 원본 찾기 (간단한 방법: 같은 순서의 원본)
          // 더 정확한 방법은 dataset 등을 활용하지만, 여기서는 간단히 처리
          const cloneIndex = Array.from(allCards).indexOf(activeCard);
          const realCardsArray = Array.from(realCards);
          // 클론이 앞쪽이면 뒤쪽 원본, 뒤쪽이면 앞쪽 원본
          if (cloneIndex < realCardsArray.length) {
            realCardsArray[realCardsArray.length - 1 - (cloneIndex % realCardsArray.length)].classList.add('is-active');
          }
        }
      } else if (!this.options.infinite) {
        // 기존 로직 (member-benefit-card 전용)
        let activeCardIndex = 0;
        let maxVisibleArea = 0;
        
        allCards.forEach((card, index) => {
          const cardRect = card.getBoundingClientRect();
          const cardLeft = cardRect.left;
          const cardRight = cardRect.right;
          const cardWidth = cardRect.width;
          
          const visibleLeft = Math.max(cardLeft, cardListLeft);
          const visibleRight = Math.min(cardRight, cardListLeft + cardListWidth);
          const visibleWidth = Math.max(0, visibleRight - visibleLeft);
          const visibleRatio = visibleWidth / cardWidth;
          
          if (visibleRatio > maxVisibleArea) {
            maxVisibleArea = visibleRatio;
            activeCardIndex = index;
          }
        });
        
        allCards.forEach((card, index) => {
          if (index === activeCardIndex) {
            card.classList.add('is-active');
          } else {
            card.classList.remove('is-active');
          }
        });
      }
    }

    /**
     * 이벤트 리스너 등록
     */
    bindEvents() {
      // 버튼 클릭 이벤트 (버튼이 있는 경우만)
      if (this.prevBtn) {
        this.prevBtn.addEventListener('click', (e) => this.scrollPrev(e));
      }
      if (this.nextBtn) {
        this.nextBtn.addEventListener('click', (e) => this.scrollNext(e));
      }
      
      // 자동 롤링: 마우스 호버 시 일시정지
      if (this.options.autoSlide) {
        this.container.addEventListener('mouseenter', () => {
          this.stopAutoSlide();
        });
        
        this.container.addEventListener('mouseleave', () => {
          this.startAutoSlide();
        });
        
        this.container.addEventListener('focusin', () => {
          this.stopAutoSlide();
        });

        this.container.addEventListener('focusout', () => {
          requestAnimationFrame(() => {
            if (!this.container.contains(document.activeElement)) {
              this.startAutoSlide();
            }
          });
        });
      }

      // 스크롤 이벤트 - 이 인스턴스의 cardList에만 바인딩
      // 각 인스턴스는 자신의 cardList에만 이벤트가 바인딩되므로 자동으로 분리됨
      this.handleScroll = () => {
        if (this.isScrolling) return; // 프로그램 스크롤 중에는 무시
        
        // 스크롤 멈춤 감지 로직 (디바운스)
        clearTimeout(this.scrollTimer);
        this.scrollTimer = setTimeout(() => {
          this.onScrollComplete(); // 스크롤 멈추면 텔레포트 체크
        }, 150);
        
        // 실시간 active 업데이트 (부드러운 효과용)
        if (this.options.pagination) {
          // 프로그래밍 방식 스크롤 중이면 계산 건너뛰기 (goToSlide에서 처리)
          // 여기서는 실시간 업데이트만
        } else {
          this.updateButtonVisibility();
          // 스크롤 완료 후 300ms 동안은 스크롤 이벤트 무시 (미세한 스크롤 변동 방지)
          const now = Date.now();
          if (this.scrollCompleteTime > 0 && (now - this.scrollCompleteTime) < 300) {
            return;
          }
          // member-benefit-card인 경우 활성 카드 업데이트
          this.updateActiveCard();
        }
      };
      
      this.cardList.addEventListener('scroll', this.handleScroll);

      // 옵션에 따라 드래그 기능 활성화
      if (
        this.options.grab &&
        window.innerWidth >= this.options.breakpoint
      ) {
        this.setupDragEvents();
      }

      // 리사이즈 이벤트 (전역 이벤트로 한 번만 등록)
      if (!window._slideResizeHandler) {
        window._slideResizeHandler = [];
        window.addEventListener('resize', () => {
          clearTimeout(window._slideResizeTimer);
          window._slideResizeTimer = setTimeout(() => {
            window._slideResizeHandler.forEach((handler) => handler());
          }, this.options.resizeDelay);
        });
      }
      window._slideResizeHandler.push(() => {
        if (this.options.infinite && window.innerWidth >= this.options.breakpoint) {
          this.initInfinite(); // 리사이즈 시 클론 재계산
          this.jumpToRealSlide(this.currentSlide, false);
        } else if (this.options.transparentCard && this.options.groupSize > 1) {
          // 투명 카드 재생성
          this.addTransparentCardIfNeeded();
        }
        
        if (this.options.pagination) {
          this.createPaginationDots();
          this.goToSlide(0);
        } else {
          this.updateButtonVisibility();
        }

        this.updateTotalPageDisplay();
        this.updateCurrentPageDisplay();
        
        // 리사이즈 시 드래그 이벤트 재설정
        if (
          this.options.grab &&
          window.innerWidth >= this.options.breakpoint
        ) {
          this.setupDragEvents();
        } else {
          this.removeDragEvents();
        }
      });
    }

    /**
     * 드래그 이벤트 설정 (PC 전용)
     */
    setupDragEvents() {
      if (!this.cardList) return;

      // 이미 드래그 이벤트가 설정되어 있으면 제거 후 재설정
      this.removeDragEvents();

      // 마우스 다운: 드래그 시작
      this.handleMouseDown = (e) => {
        if (window.innerWidth < this.options.breakpoint) return;
        this.isDragging = true;
        this.startX = e.pageX - this.cardList.offsetLeft;
        this.scrollLeft = this.cardList.scrollLeft;
        this.cardList.style.cursor = 'grabbing';
        this.cardList.style.userSelect = 'none';
      };

      // 마우스 리브: 드래그 종료
      this.handleMouseLeave = () => {
        this.endDrag();
      };

      // 마우스 업: 드래그 종료
      this.handleMouseUp = () => {
        this.endDrag();
      };

      // 마우스 무브: 드래그 중 스크롤
      this.handleMouseMove = (e) => {
        if (!this.isDragging || window.innerWidth < this.options.breakpoint) return;
        e.preventDefault();
        const x = e.pageX - this.cardList.offsetLeft;
        const walk = (x - this.startX) * 2; // 스크롤 속도 조절 (2배)
        this.cardList.scrollLeft = this.scrollLeft - walk;
      };

      // 이벤트 리스너 등록
      this.cardList.addEventListener('mousedown', this.handleMouseDown);
      this.cardList.addEventListener('mouseleave', this.handleMouseLeave);
      this.cardList.addEventListener('mouseup', this.handleMouseUp);
      this.cardList.addEventListener('mousemove', this.handleMouseMove);

      // 커서 스타일 설정
      this.cardList.style.cursor = 'grab';
    }

    /**
     * 드래그 종료 처리
     */
    endDrag() {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.cardList.style.cursor = 'grab';
      this.cardList.style.userSelect = '';
      this.onScrollComplete(); // 드래그 끝나면 위치 보정
    }

    /**
     * 드래그 이벤트 제거
     */
    removeDragEvents() {
      if (!this.cardList) return;

      if (this.handleMouseDown) {
        this.cardList.removeEventListener('mousedown', this.handleMouseDown);
      }
      if (this.handleMouseLeave) {
        this.cardList.removeEventListener('mouseleave', this.handleMouseLeave);
      }
      if (this.handleMouseUp) {
        this.cardList.removeEventListener('mouseup', this.handleMouseUp);
      }
      if (this.handleMouseMove) {
        this.cardList.removeEventListener('mousemove', this.handleMouseMove);
      }

      // 커서 스타일 초기화
      this.cardList.style.cursor = '';
      this.cardList.style.userSelect = '';
      this.isDragging = false;
    }

    // refresh
    refresh() {
      if (!this.cardList) return;

      this.stopAutoSlide();

      clearTimeout(this.scrollTimer);

      this.isDragging = false;
      this.isScrolling = false;
      this.isAnimating = false;
      this.currentSlide = 0;
      this.autoLoopIndex = 0;
      this.scrollCompleteTime = 0;

      this.cardList.scrollTo({
        left: 0,
        top: 0,
        behavior: 'auto',
      });

      // 기존 클론/투명카드 정리
      this.cardList.querySelectorAll('.is-clone').forEach((el) => el.remove());
      this.cardList.querySelectorAll(`.${this.options.transparentCardClass}`).forEach((el) => el.remove());

      // 카드 다시 수집
      this.cards = this.cardList.querySelectorAll(this.options.cardSelector);

      if (this.options.infinite && window.innerWidth >= this.options.breakpoint) {
        this.initInfinite();
        requestAnimationFrame(() => {
          this.jumpToRealSlide(0, false);
        });
      } else if (this.options.transparentCard && this.options.groupSize > 1) {
        this.addTransparentCardIfNeeded();
      }

      if (this.options.pagination) {
        this.createPaginationDots();
      }

      this.updateButtonVisibility();
      this.updateTotalPageDisplay();
      this.updateCurrentPageDisplay();
      this.updateActiveCard();

      if (this.options.autoSlide) {
        this.startAutoSlide();
      }
    }

    /**
     * 인스턴스 정리 (필요시 사용)
     */
    destroy() {
      // 드래그 이벤트 제거
      this.removeDragEvents();
      
      // 스크롤 이벤트 제거
      if (this.cardList && this.handleScroll) {
        this.cardList.removeEventListener('scroll', this.handleScroll);
      }
      
      // 타이머 정리
      if (this.scrollTimer) {
        clearTimeout(this.scrollTimer);
      }
      
      // 페이지네이션 도트 제거 (이 인스턴스가 생성한 것만)
      if (this.paginationDots && this.paginationDots.length > 0) {
        this.paginationDots.forEach(dot => {
          if (dot.parentNode && dot.getAttribute('data-slide-instance-id') === this.instanceId) {
            dot.remove();
          }
        });
      }
    }
    /**
     * slide-page 총 페이지 수 업데이트
     */
    updateTotalPageDisplay() {
      if (!this.totalPageEl) return;
  
      const totalSlides = this.getTotalSlides();
      const total = totalSlides > 0 ? totalSlides : 1;
      this.totalPageEl.textContent = total;
    }
  
    /**
     * slide-page 현재 페이지 업데이트
     */
    updateCurrentPageDisplay() {
      if (!this.currentPageEl) return;
  
      const totalSlides = this.getTotalSlides();
      const current = totalSlides > 0 ? this.currentSlide + 1 : 1;
      this.currentPageEl.textContent = current;
    }
  }

  /**
   * 슬라이드 컨트롤러 초기화
   * @param {string|HTMLElement} selectorOrElement - 컨테이너 선택자 또는 요소
   * @param {Object} options - 설정 옵션
   * @returns {SlideController|null} 슬라이드 컨트롤러 인스턴스
   */
  SlideController.init = function (selectorOrElement, options = {}) {
    let container;
    if (typeof selectorOrElement === 'string') {
      container = document.querySelector(selectorOrElement);
    } else if (selectorOrElement instanceof HTMLElement) {
      container = selectorOrElement;
    } else {
      return null;
    }

    if (!container) {
      return null;
    }

    return new SlideController(container, options);
  };

  // 이미 초기화된 인스턴스 추적 (중복 초기화 방지)
  const initializedContainers = new WeakSet();

  /**
   * 슬라이드 컨트롤러 초기화 (중복 방지 포함)
   * @param {HTMLElement} container - 슬라이드 컨테이너 요소
   * @returns {SlideController|null} 슬라이드 컨트롤러 인스턴스
   */
  function initSlide(container) {
    // 이미 초기화된 컨테이너는 건너뛰기
    if (initializedContainers.has(container)) {
      return null;
    }

    const instance = new SlideController(container);
    
    // 정상적으로 초기화된 경우만 추적
    // 그룹 모드 + 페이지네이션 모드에서는 버튼이 없을 수 있음
    const isGroupMode = container.hasAttribute('data-slide-group') || 
                        container.hasAttribute('data-slide-pagination');
    const requiresButtons = !isGroupMode;
    
    if (instance.cardList && (!requiresButtons || (instance.prevBtn && instance.nextBtn))) {
      initializedContainers.add(container);
      container._slideController = instance;
      return instance;
    }

    return null;
  }

  /**
   * 페이지 로드 시 자동 초기화
   * data-slide-container 속성을 가진 모든 요소를 찾아 초기화
   * 단, data-benefit-slide가 있는 요소는 제외 (main-benefit-slide.js 전용)
   */
  function autoInit() {
    const containers = document.querySelectorAll('[data-slide-container]');
    const instances = [];

    containers.forEach((container) => {
      if (container.hasAttribute('data-benefit-slide')) {
        return;
      }

      const instance = initSlide(container);
      if (instance) {
        instances.push(instance);
      }
    });

    setupSlideListRefreshObserver();

    return instances;
  }

  /**
   * MutationObserver를 사용하여 동적으로 추가되는 슬라이드 컨테이너 감지
   * 단, data-benefit-slide가 있는 요소는 제외 (main-benefit-slide.js 전용)
   */
  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return; // Element 노드만 처리

          // 추가된 노드 자체가 슬라이드 컨테이너인지 확인
          if (node.hasAttribute && node.hasAttribute('data-slide-container')) {
            // data-benefit-slide가 있으면 제외
            if (!node.hasAttribute('data-benefit-slide')) {
              initSlide(node);
            }
          }

          // 추가된 노드 내부에 슬라이드 컨테이너가 있는지 확인
          const containers = node.querySelectorAll
            ? node.querySelectorAll('[data-slide-container]')
            : [];
          containers.forEach((container) => {
            // data-benefit-slide가 있으면 제외
            if (!container.hasAttribute('data-benefit-slide')) {
              initSlide(container);
            }
          });
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return observer;
  }

  // 초기화 함수
  function initialize() {
    // MutationObserver 설정 (동적 컨텐츠 감지) - 먼저 설정
    setupMutationObserver();

    // import.js가 비동기로 로드되므로 지연 후 재시도
    // 여러 번 시도하여 동적 로드된 컨텐츠도 처리
    const retryIntervals = [0, 100, 300, 500, 1000, 2000];
    retryIntervals.forEach((delay) => {
      setTimeout(() => {
        autoInit();
      }, delay);
    });
  }

  // DOMContentLoaded 또는 이미 로드된 경우 즉시 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    // 이미 로드된 경우 즉시 실행
    initialize();
  }

  // 전역으로 노출 (필요시 사용)
  window.SlideController = SlideController;
  window.refreshSlideController = function (selectorOrElement) {
    const container = typeof selectorOrElement === 'string'
      ? document.querySelector(selectorOrElement)
      : selectorOrElement;

    if (!container) return;

    if (container._slideController && typeof container._slideController.refresh === 'function') {
      container._slideController.refresh();
    }
  };
  function setupSlideListRefreshObserver() {
    const targets = document.querySelectorAll('.promo-travel__slider[data-slide-container]');

    targets.forEach((container) => {
      if (container._slideListObserver) return;

      const list = container.querySelector('[data-slide-list]');
      if (!list) return;

      let refreshTimer = null;

      const observer = new MutationObserver(() => {
        clearTimeout(refreshTimer);

        refreshTimer = setTimeout(() => {
          if (
            container._slideController &&
            typeof container._slideController.refresh === 'function'
          ) {
            container._slideController.refresh();
          }
        }, 50);
      });

      observer.observe(list, {
        childList: true,
        subtree: false,
      });

      container._slideListObserver = observer;
    });
  }
})();

/**
 * [data-modal] 다이얼로그: 열릴 때 첫 포커스 가능 요소로 이동, Tab/Shift+Tab은 내부 순환.
 * hidden 속성으로 열고 닫는 기존 페이지 스크립트와 호환 (MutationObserver).
 */
(function initModalFocusTrap() {
  const TABBABLE_SELECTOR = [
    'a[href]:not([tabindex="-1"])',
    'area[href]',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    'iframe',
    'audio[controls]',
    'video[controls]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]:not([tabindex="-1"])',
  ].join(',');

  /** @type {{ modal: Element, previousActive: Element | null, dialogTabindexAdded: boolean } | null} */
  let activeModalState = null;

  function getModalFocusRoot(modal) {
    return modal.querySelector('.modal__dialog') || modal;
  }

  function isModalVisible(el) {
    if (!el.getClientRects().length) return false;
    const st = window.getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none') return false;
    let p = el;
    while (p) {
      if (p.hasAttribute && p.hasAttribute('hidden')) return false;
      p = p.parentElement;
    }
    return true;
  }

  function getTabbableInModal(modal) {
    const root = getModalFocusRoot(modal);
    const nodes = root.querySelectorAll(TABBABLE_SELECTOR);
    return Array.prototype.filter.call(nodes, function (el) {
      if (!isModalVisible(el)) return false;
      if (el.closest && el.closest('.modal__backdrop')) return false;
      return true;
    });
  }

  function focusFirstInModal(modal) {
    const list = getTabbableInModal(modal);
    if (list.length) {
      list[0].focus({ preventScroll: true });
      return;
    }
    const root = getModalFocusRoot(modal);
    if (root && root !== modal) {
      root.setAttribute('tabindex', '-1');
      if (activeModalState) activeModalState.dialogTabindexAdded = true;
      root.focus({ preventScroll: true });
    }
  }

  function clearDialogTabindex(modal) {
    if (!activeModalState || !activeModalState.dialogTabindexAdded) return;
    const root = getModalFocusRoot(modal);
    if (root && root.getAttribute('tabindex') === '-1') {
      root.removeAttribute('tabindex');
    }
    activeModalState.dialogTabindexAdded = false;
  }

  function onModalOpened(modal) {
    activeModalState = {
      modal: modal,
      previousActive: document.activeElement,
      dialogTabindexAdded: false,
    };
    requestAnimationFrame(function () {
      if (modal.hasAttribute('hidden')) return;
      focusFirstInModal(modal);
    });
  }

  function onModalClosed(modal) {
    if (!activeModalState || activeModalState.modal !== modal) return;
    clearDialogTabindex(modal);
    var prev = activeModalState.previousActive;
    activeModalState = null;
    requestAnimationFrame(function () {
      if (document.querySelector('[data-modal]:not([hidden])')) return;
      if (prev && typeof prev.focus === 'function' && document.body.contains(prev)) {
        prev.focus({ preventScroll: true });
      }
    });
  }

  function attachModalObserver(modal) {
    if (!modal || modal.nodeType !== 1 || modal.dataset.modalA11yObserved) return;
    modal.dataset.modalA11yObserved = 'true';
    var obs = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].attributeName !== 'hidden') continue;
        if (modal.hasAttribute('hidden')) onModalClosed(modal);
        else onModalOpened(modal);
      }
    });
    obs.observe(modal, { attributes: true, attributeFilter: ['hidden'] });
  }

  function scanModals(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.matches && root.matches('[data-modal]')) attachModalObserver(root);
    root.querySelectorAll && root.querySelectorAll('[data-modal]').forEach(attachModalObserver);
  }

  document.addEventListener(
    'keydown',
    function (e) {
      if (e.key !== 'Tab' || !activeModalState) return;
      var modal = activeModalState.modal;
      if (!modal || modal.hasAttribute('hidden')) return;
      var list = getTabbableInModal(modal);
      if (!list.length) return;
      var first = list[0];
      var last = list[list.length - 1];
      var ae = document.activeElement;
      if (list.length === 1) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (e.shiftKey) {
        if (ae === first || !modal.contains(ae)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (ae === last || !modal.contains(ae)) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    true
  );

  function boot() {
    scanModals(document.body);
    var bodyObs = new MutationObserver(function (records) {
      records.forEach(function (r) {
        r.addedNodes.forEach(function (node) {
          scanModals(node);
        });
      });
    });
    if (document.body) {
      bodyObs.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

// 모달 열기/닫기 스크립트
(function () {
  const openButtons = document.querySelectorAll('[data-open-modal]');
  const modals = document.querySelectorAll('[data-modal]');
  const closeButtons = document.querySelectorAll('[data-action="close"]');
  const backdrops = document.querySelectorAll('.modal__backdrop');

  // 모달 열기
  openButtons.forEach(button => {
    button.addEventListener('click', function () {
      const modalId = this.getAttribute('data-open-modal');
      const modal = document.querySelector(`[data-modal="${modalId}"]`);
      if (modal) {
        modal.removeAttribute('hidden');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  // 모달 닫기 함수
  function closeModal(modal) {
    modal.setAttribute('hidden', '');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // 닫기 버튼 클릭
  closeButtons.forEach(button => {
    button.addEventListener('click', function () {
      const modal = this.closest('[data-modal]');
      if (modal) {
        closeModal(modal);
      }
    });
  });

  // 백드롭 클릭
  backdrops.forEach(backdrop => {
    backdrop.addEventListener('click', function () {
      const modal = this.closest('[data-modal]');
      if (modal && !backdrop.classList.contains('no-close-modal')) {
        closeModal(modal);
      }
    });
  });

  // ESC 키로 닫기
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      const openModal = document.querySelector('[data-modal]:not([hidden])');
      const noCloseModal = openModal.querySelector('.no-close-modal');

      if (openModal && !noCloseModal) {
        closeModal(openModal);
      }
    }
  });
})();

// 테이블 스크롤여부
function initTableScrollHint(wrapper) {
  if (!wrapper || wrapper.dataset.scrollHintInit === "true") return;

  wrapper.dataset.scrollHintInit = "true";

  wrapper.addEventListener(
    "scroll",
    () => {
      wrapper.classList.remove("is-scrollable");
      wrapper.dataset.scrollHintUsed = "true";
    },
    { once: true }
  );
}

function updateTableScrollHint(wrapper) {
  if (!wrapper || wrapper.dataset.scrollHintUsed === "true") return;

  // hidden 상태에서는 계산하지 않음
  if (wrapper.offsetParent === null) return;

  const isScrollable = wrapper.scrollWidth > wrapper.clientWidth;

  wrapper.classList.toggle("is-scrollable", isScrollable);
}

function updateVisibleTableScrollHints(root = document) {
  root.querySelectorAll(".table-scroll-wrapper").forEach((wrapper) => {
    initTableScrollHint(wrapper);
    updateTableScrollHint(wrapper);
  });
}

let tableScrollHintResizeRaf = null;

window.addEventListener("resize", () => {
  if (tableScrollHintResizeRaf) {
    cancelAnimationFrame(tableScrollHintResizeRaf);
  }

  tableScrollHintResizeRaf = requestAnimationFrame(() => {
    updateVisibleTableScrollHints();
    tableScrollHintResizeRaf = null;
  });
});

updateVisibleTableScrollHints();

// 소득공제 복리이자 계산기
(() => {
  const calculators = document.querySelectorAll('[data-js="benefitCalculator"]');
  if (!calculators.length) return;

  const toNumber = (value) => Number(String(value).replace(/,/g, '').replace(/\D/g, '') || 0);
  const formatWon = (value) => `${Math.round(value).toLocaleString('ko-KR')}원`;

  const getIncomeRate = (income) => {
    if (0 <= income && income <= 14000000) return 0.066;
    if (14000000 < income && income <= 50000000) return 0.165;
    if (50000000 < income && income <= 88000000) return 0.264;
    if (88000000 < income && income <= 150000000) return 0.385;
    if (150000000 < income && income <= 300000000) return 0.418;
    if (300000000 < income && income <= 500000000) return 0.44;
    if (500000000 < income && income <= 1000000000) return 0.462;
    return 0.495;
  };

  const getMoneyLimit = (income) => {
    if (0 <= income && income <= 40000000) return 6000000;
    if (40000000 < income && income <= 60000000) return 5000000;
    if (60000000 < income && income <= 100000000) return 4000000;
    return 2000000;
  };

  const updateComma = (input) => {
    const value = toNumber(input.value);
    input.value = value ? value.toLocaleString('ko-KR') : '';
  };

  window.calculateBenefit = function (button) {
    const calculator = button.closest('[data-js="benefitCalculator"]');
    if (!calculator) return;

    const incomeInput = calculator.querySelector('[data-js="incomeInput"]');
    const monthlyInput = calculator.querySelector('[data-js="monthlyInput"]');

    const savedTaxEl = calculator.querySelector('[data-js="savedTax"]');
    const interestEl = calculator.querySelector('[data-js="interest"]');
    const taxRateEl = calculator.querySelector('[data-js="taxRate"]');
    const totalBenefitEl = calculator.querySelector('[data-js="totalBenefit"]');

    const income = toNumber(incomeInput.value);
    const monthlyPayment = toNumber(monthlyInput.value);

    if (monthlyPayment < 50000 || monthlyPayment > 1500000) {
      alert('매달 납부금액은 5만원~150만원 이하까지 입력가능합니다.');
      monthlyInput.value = '';
      monthlyInput.focus();
      return;
    }

    if (monthlyPayment % 10000 !== 0) {
      alert('납부금액은 만원 단위로 입력해주세요.');
      monthlyInput.value = '';
      monthlyInput.focus();
      return;
    }

    const incomeRate = getIncomeRate(income);
    const moneyLimit = getMoneyLimit(income);

    const payYear = 1;
    const newYear = 1;
    const interestRate = 0.037;
    const principalPaid = monthlyPayment * 12;

    let incomeDeduction = 0;

    if (monthlyPayment * 12 <= moneyLimit) {
      incomeDeduction =
        monthlyPayment * 12 * (payYear - 1) +
        monthlyPayment * (12 - newYear + 1);
    } else {
      incomeDeduction =
        moneyLimit * (payYear - 1) +
        Math.min(moneyLimit, monthlyPayment * (12 - newYear + 1));
    }

    const savedTax = Math.round(incomeDeduction * incomeRate);

    const interest = Math.round(
      monthlyPayment *
        (
          Math.pow(1 + interestRate, 13 / 12) -
          Math.pow(1 + interestRate, 1 / 12)
        ) /
        (Math.pow(1 + interestRate, 1 / 12) - 1) -
        principalPaid
    );

    const totalBenefit = savedTax + interest;

    savedTaxEl.textContent = formatWon(savedTax);
    interestEl.textContent = formatWon(interest);
    taxRateEl.textContent = `${(incomeRate * 100).toFixed(1)}%`;
    totalBenefitEl.textContent = formatWon(totalBenefit);
  };

  calculators.forEach((calculator) => {
    const incomeInput = calculator.querySelector('[data-js="incomeInput"]');
    const monthlyInput = calculator.querySelector('[data-js="monthlyInput"]');
    const button = calculator.querySelector('[onclick^="calculateBenefit"]');

    [incomeInput, monthlyInput].forEach((input) => {
      if (!input) return;

      input.addEventListener('input', () => updateComma(input));

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          window.calculateBenefit(button);
        }
      });
    });
  });
})();

// 혜택플러스
(function () {
  var grid = document.getElementById("benefit-category-grid");
  var moreBtn = document.querySelector("[data-js='benefit-category-more']");
  var closeBtn = document.getElementById("benefit-category-close");
  if (!grid || !moreBtn || !closeBtn) return;

  function openPanel() {
    grid.classList.add("is-open");
    moreBtn.setAttribute("aria-expanded", "true");
  }

  function closePanel() {
    grid.classList.remove("is-open");
    moreBtn.setAttribute("aria-expanded", "false");
  }

  moreBtn.addEventListener("click", openPanel);
  closeBtn.addEventListener("click", closePanel);
})();