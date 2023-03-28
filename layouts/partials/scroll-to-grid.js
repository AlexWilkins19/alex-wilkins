
<script>
(function() {
  const nextButton = document.querySelector(".next-link");
  const prevButton = document.querySelector(".prev-link");

  const scrollToGrid = () => {
    localStorage.setItem("scrollToGrid", "true");
  };

  if (nextButton) {
    nextButton.addEventListener("click", scrollToGrid);
  }

  if (prevButton) {
    prevButton.addEventListener("click", scrollToGrid);
  }

  if (localStorage.getItem("scrollToGrid") === "true") {
    const gridElement = document.querySelector("#newscientisttop");
    gridElement.scrollIntoView({ behavior: "smooth" });
    localStorage.removeItem("scrollToGrid");
  }
})();

</script>
