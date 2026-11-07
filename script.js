const menuToggle = document.querySelector('#menuToggle');
const mainNav = document.querySelector('#mainNav');

menuToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
});

mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  });
});

document.querySelector('#year').textContent = new Date().getFullYear();

const contactForm = document.querySelector('#contactForm');
const formStatus = document.querySelector('#formStatus');

contactForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!contactForm.checkValidity()) {
    contactForm.reportValidity();
    return;
  }

  // Demonstração front-end: nenhum dado é enviado ou guardado.
  formStatus.textContent = 'Obrigado pela mensagem! O formulário está validado. Para receber os pedidos, configure um backend ou serviço de formulários.';
  formStatus.classList.add('success');
  contactForm.reset();
});
