{{ define "partials/carousel.js" }}
<script>
document.addEventListener('DOMContentLoaded', () => {
  class HighlightsCarousel {
    constructor() {
      // DOM elements
      this.carouselContainer = document.querySelector('.highlights-carousel');
      this.track = document.querySelector('.carousel-track');
      this.slides = Array.from(document.querySelectorAll('.carousel-slide'));
      this.prevButton = document.querySelector('.carousel-arrow.prev');
      this.nextButton = document.querySelector('.carousel-arrow.next');
      this.progressContainer = document.querySelector('.carousel-progress');

      // For tracking the visible "slide group" if you still want dots
      this.currentGroup = 0;
      this.slidesToShow = this.getSlidesToShow();
      this.totalSlides = this.slides.length;
      this.totalGroups = Math.ceil(this.totalSlides / this.slidesToShow);

      // Attach listeners
      this.init();
    }

    getSlidesToShow() {
      const width = window.innerWidth;
      if (width > 1024) return 3;
      if (width > 768) return 2;
      return 1;
    }

    init() {
      // Only if you want to generate progress dots:
      this.createProgressDots();
      this.updateProgressDots();

      // Set up arrow buttons
      this.prevButton.addEventListener('click', () => this.scrollPrev());
      this.nextButton.addEventListener('click', () => this.scrollNext());

      // Whenever the user scrolls, figure out which "group" they’re in.
      // (This can be somewhat approximate if you allow free scrolling.)
      this.carouselContainer.addEventListener('scroll', () => {
        this.updateCurrentGroup();
        this.updateProgressDots();
      });

      // Handle window resize
      window.addEventListener('resize', () => {
        const newSlidesToShow = this.getSlidesToShow();
        if (newSlidesToShow !== this.slidesToShow) {
          this.slidesToShow = newSlidesToShow;
          this.totalGroups = Math.ceil(this.totalSlides / this.slidesToShow);
          this.createProgressDots();
          this.updateProgressDots();
        }
      });
    }

    // --- Progress dots (optional) ---
    createProgressDots() {
      this.progressContainer.innerHTML = '';
      for (let i = 0; i < this.totalGroups; i++) {
        const dot = document.createElement('button');
        dot.className = 'progress-dot';
        dot.setAttribute('aria-label', `Go to slide group ${i + 1}`);
        dot.addEventListener('click', () => this.scrollToGroup(i));
        this.progressContainer.appendChild(dot);
      }
    }

    updateProgressDots() {
      const dots = this.progressContainer.querySelectorAll('.progress-dot');
      dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === this.currentGroup);
      });
    }

    // Figure out which group of slides is mostly in view
    updateCurrentGroup() {
      // The width of one slide (including margin) to figure out how many fit
      const slideWidth = this.slides[0].offsetWidth;
      const scrollLeft = this.carouselContainer.scrollLeft;
      const groupIndex = Math.round(scrollLeft / (slideWidth * this.slidesToShow));
      this.currentGroup = Math.min(this.totalGroups - 1, Math.max(0, groupIndex));
    }

    // Scroll to a particular group index
    scrollToGroup(groupIndex) {
      this.currentGroup = groupIndex;
      const slideWidth = this.slides[0].offsetWidth;
      const targetLeft = slideWidth * this.slidesToShow * groupIndex;
      this.carouselContainer.scrollTo({ left: targetLeft, behavior: 'smooth' });
      this.updateProgressDots();
    }

    // --- Arrow scrolling ---
    scrollNext() {
      const slideWidth = this.slides[0].offsetWidth;
      // Move exactly one group (or just one slide if you prefer)
      const distance = slideWidth * this.slidesToShow;
      this.carouselContainer.scrollBy({ left: distance, behavior: 'smooth' });
    }

    scrollPrev() {
      const slideWidth = this.slides[0].offsetWidth;
      const distance = slideWidth * this.slidesToShow;
      this.carouselContainer.scrollBy({ left: -distance, behavior: 'smooth' });
    }
  }

  new HighlightsCarousel();
});
</script>
{{ end }}
