document.addEventListener("DOMContentLoaded", function () {

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


  window.scrollToWork = function () {
    const section = document.getElementById("worksection");
    if (!section) return; 

    const offset = 130;
    const sectionPosition = section.offsetTop - offset;

    window.scrollTo({
      top: sectionPosition,
      behavior: "smooth",
    });
  };
});


document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function(event) {
      event.preventDefault(); 

      const targetId = this.getAttribute("href").substring(1); // 取得 ID
      const targetElement = document.getElementById(targetId);
      const offset = 130; 

      if (targetElement) {
          const elementPosition = targetElement.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({
              top: elementPosition - offset, 
              behavior: "smooth"
          });
      }
  });
});
