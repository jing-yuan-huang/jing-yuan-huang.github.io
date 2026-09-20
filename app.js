if (typeof gsap !== 'undefined' && typeof ScrambleTextPlugin !== 'undefined') {
  gsap.registerPlugin(ScrambleTextPlugin);
}

document.addEventListener("DOMContentLoaded", function () {
  // 平滑捲動（Lenis）：整頁帶緩動地跟著捲動，手感更滑順
  var lenis = null;
  if (typeof Lenis !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    var lenisRaf = function (time) { lenis.raf(time); requestAnimationFrame(lenisRaf); };
    requestAnimationFrame(lenisRaf);
  }

  // 處理動畫效果：讓元素進入畫面時淡入一次，之後不再移除
  // （原本用 toggle，離開畫面會把名字拉回 opacity:0 導致消失或殘影）
  const animatedElements = document.querySelectorAll(".fadeInUp");
  if (animatedElements.length > 0) {
    const reveal = (element) => element.classList.add("animated");

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    animatedElements.forEach((element) => observer.observe(element));

    // 保險：若 observer 因分頁在背景/被節流而沒觸發，仍確保名字最終會顯示
    window.setTimeout(() => animatedElements.forEach(reveal), 1500);
  }

  // 通用進場動畫：元素滑入畫面時淡入上升（一次性）
  const revealElements = document.querySelectorAll(".reveal");
  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    revealElements.forEach((element) => revealObserver.observe(element));

    // 保險：若 observer 未觸發（分頁在背景/被節流），仍確保內容最終會顯示
    window.setTimeout(() => revealElements.forEach((el) => el.classList.add("is-visible")), 3000);
  }

  // 底部跑馬燈：隨捲動位置左右移動（往下滑文字往左移，往上滑往右移）
  const marquee = document.querySelector(".marquee");
  if (marquee) {
    const track = marquee.querySelector(".marquee-track");
    const baseItem = track.querySelector(".marquee-item");
    if (track && baseItem) {
      const SPEED = 0.6; // 捲動 1px，文字移動的比例
      let oneWidth = baseItem.getBoundingClientRect().width;

      const buildClones = () => {
        // 移除舊的複製，只留第一份
        while (track.children.length > 1) track.removeChild(track.lastChild);
        oneWidth = baseItem.getBoundingClientRect().width;
        // 複製到足夠寬（視窗寬 + 兩份），確保左移時右側不留白、可無縫循環
        const need = window.innerWidth + oneWidth * 2;
        while (track.getBoundingClientRect().width < need) {
          track.appendChild(baseItem.cloneNode(true));
        }
      };

      const updateMarquee = () => {
        if (!oneWidth) return;
        const offset = (window.scrollY * SPEED) % oneWidth;
        track.style.transform = "translateX(" + -offset + "px)";
      };

      buildClones();
      updateMarquee();
      window.addEventListener("scroll", updateMarquee, { passive: true });
      window.addEventListener("resize", () => { buildClones(); updateMarquee(); });
    }
  }

  // 滑過首頁 hero 之後，header 才變半透明毛玻璃
  const headerEl = document.querySelector("header");
  const heroEl = document.querySelector(".main-area");
  if (headerEl && heroEl) {
    const updateHeader = () => {
      const threshold = heroEl.offsetHeight - headerEl.offsetHeight;
      headerEl.classList.toggle("scrolled", window.scrollY > threshold);
    };
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    window.addEventListener("resize", updateHeader);
  }

  // 處理菜單開關
  const menuToggle = document.querySelector(".menu-toggle");
  const closeMenu = document.querySelector(".close-menu");
  const nav = document.querySelector("nav");

  if (menuToggle && closeMenu && nav) {
    menuToggle.addEventListener("click", function (event) {
      event.stopPropagation();
      nav.classList.add("active");
    });

    closeMenu.addEventListener("click", function () {
      nav.classList.remove("active");
    });

    document.addEventListener("click", function (event) {
      if (!nav.contains(event.target) && !menuToggle.contains(event.target)) {
        nav.classList.remove("active");
      }
    });
  }

  // 通用滾動到指定元素的函數
  const scrollToElement = function (elementId, offset = 130) {
    const targetElement = document.getElementById(elementId);
    if (!targetElement) return;

    if (lenis) {
      lenis.scrollTo(targetElement, { offset: -offset });
      return;
    }
    const elementPosition = targetElement.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: elementPosition - offset,
      behavior: "smooth"
    });
  };

  // 使用通用滾動函數
  window.scrollToWork = function () {
    scrollToElement("worksection");
  };

  // Work 標籤篩選
  const filterBar = document.getElementById("work-filter");
  if (filterBar) {
    const filterButtons = Array.from(filterBar.querySelectorAll(".filter-pill"));
    const allButton = filterBar.querySelector('[data-filter="all"]');
    const cards = Array.from(document.querySelectorAll(".cards-container2 > a"));

    const applyFilter = function () {
      const active = filterButtons.filter((btn) => btn !== allButton && btn.classList.contains("active"));

      if (active.length === 0) {
        allButton.classList.add("active");
        cards.forEach((card) => { card.style.display = ""; });
        return;
      }

      allButton.classList.remove("active");
      const selected = active.map((btn) => btn.dataset.filter);

      cards.forEach((card) => {
        const skills = (card.dataset.skills || "").split(",");
        const matches = selected.some((skill) => skills.includes(skill));
        card.style.display = matches ? "" : "none";
      });
    };

    filterButtons.forEach((btn) => {
      btn.addEventListener("click", function () {
        if (btn === allButton) {
          filterButtons.forEach((b) => b.classList.remove("active"));
          allButton.classList.add("active");
        } else {
          btn.classList.toggle("active");
        }
        applyFilter();
      });
    });
  }

  // 錨點鏈接滾動
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function(event) {
      event.preventDefault(); 
      const targetId = this.getAttribute("href").substring(1);
      scrollToElement(targetId);
    });
  });
});
