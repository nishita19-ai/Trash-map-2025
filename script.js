// script.js — TrashMap Web Interactions

// ========================
// :: Preloader Animation
// ========================
window.addEventListener('load', () => {
  const preloader = document.getElementById('ct-preloader');
  if (preloader) {
    preloader.classList.add('fade-out');
    setTimeout(() => {
      preloader.style.display = 'none';
    }, 800); // match with fade-out animation time
  }
});

 document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
      loginBtn.addEventListener("click", () => {
        window.location.href = "login.html";
      });
    }
  });
// ========================


window.addEventListener('scroll', revealOnScroll);
window.addEventListener('load', revealOnScroll); // Trigger once on load

// CSS to support this:
// .reveal.revealed { opacity: 1; transform: none; transition: all 0.6s ease; }
// (already handled in your CSS with animations)

// ========================
// :: Try Now Button Scroll
// ========================
const tryNowBtn = document.getElementById('loginBtn');
const loginSection = document.querySelector('.login-section');

if (tryNowBtn && loginSection) {
  tryNowBtn.addEventListener('click', () => {
    loginSection.scrollIntoView({ behavior: 'smooth' });
  });
}

// Scroll reveal animations
document.addEventListener("DOMContentLoaded", () => {
  const revealElements = document.querySelectorAll(".reveal, .reveal-left, .reveal-right");

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        observer.unobserve(entry.target); // Animate once
      }
    });
  }, { threshold: 0.2 }); // Trigger when 20% visible

  revealElements.forEach(el => observer.observe(el));
});

document.addEventListener("DOMContentLoaded", () => {
  const reveals = document.querySelectorAll(".timeline-item");

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  reveals.forEach(item => observer.observe(item));
});


document.addEventListener("scroll", () => {
  const navbar = document.querySelector(".navbar");
  if (window.scrollY > 50) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

// Reveal on Scroll
const revealElements = document.querySelectorAll(".reveal-left, .reveal-right");

function revealOnScroll() {
  const triggerBottom = window.innerHeight * 0.85;

  revealElements.forEach((el) => {
    const boxTop = el.getBoundingClientRect().top;
    if (boxTop < triggerBottom) {
      el.classList.add("active");
    }
  });
}

window.addEventListener("scroll", revealOnScroll);
window.addEventListener("load", revealOnScroll);


// Scroll reveal effect for Team Cards
document.addEventListener("DOMContentLoaded", () => {
  const teamCards = document.querySelectorAll(".team-card");

  function revealOnScroll() {
    const triggerBottom = window.innerHeight * 0.85;
    teamCards.forEach(card => {
      const cardTop = card.getBoundingClientRect().top;
      if (cardTop < triggerBottom) {
        card.classList.add("reveal");
      }
    });
  }

  window.addEventListener("scroll", revealOnScroll);
  revealOnScroll(); // Initial check
});




// ========================
// :: Firebase Auth (If Used)
// ========================
// Note: Authentication logic should be modularized in a separate file.
// Example pattern:

// import { auth } from './firebaseconfig.js';
// import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';

// const registerUser = async (email, password) => {
//   try {
//     const userCredential = await createUserWithEmailAndPassword(auth, email, password);
//     await sendEmailVerification(userCredential.user);
//     alert("Verification email sent. Please check your inbox.");
//   } catch (error) {
//     console.error(error.message);
//     alert("Registration failed: " + error.message);
//   }
// };

// ========================
// :: Utility Functions (if needed)
// ========================
// You can add helper functions here like modal toggles, form validations, etc.

// Example:
// const showToast = (message, type = 'success') => {
//   // implement toast popup
// };
