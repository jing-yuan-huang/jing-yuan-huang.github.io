document.addEventListener("DOMContentLoaded", function () {
  // 處理動畫效果
  const animatedElements = document.querySelectorAll(".fadeInUp");
  if (animatedElements.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("animated", entry.isIntersecting);
        });
      },
      { threshold: 0.5 }
    );
    animatedElements.forEach((element) => observer.observe(element));
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

  // 滾動動畫效果
  const cloud_1 = document.getElementById("cloud_1");
  const cloud_2 = document.getElementById("cloud_2");
  const hill_1 = document.getElementById("hill_1");
  const hill_2 = document.getElementById("hill_2");

  // 檢查是否成功抓到元素
  if (cloud_1 && cloud_2 && hill_1 && hill_2) {
    window.addEventListener("scroll", () => {
      let value = window.scrollY;
      cloud_1.style.left = value * -1.5 + "px";
      cloud_2.style.left = value * 1.5 + "px";
      hill_1.style.left = value * -1.5 + "px";
      hill_2.style.left = value * 1.5 + "px";
    });
  } else {
    console.warn("❗ 有些 hill 或 cloud 元素未正確載入！");
  }

  // 通用滾動到指定元素的函數
  const scrollToElement = function (elementId, offset = 130) {
    const targetElement = document.getElementById(elementId);
    if (!targetElement) return;

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

  // 錨點鏈接滾動
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function(event) {
      event.preventDefault(); 
      const targetId = this.getAttribute("href").substring(1);
      scrollToElement(targetId);
    });
  });
});
