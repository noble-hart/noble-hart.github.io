(function(){
  const toggle=document.querySelector('.menu-toggle');
  const nav=document.querySelector('.nav-links');
  if(toggle&&nav){
    toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',open)});
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')))
  }

  document.querySelectorAll('#year').forEach(el=>el.textContent=new Date().getFullYear());
  const items=document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}})},{threshold:.12});
    items.forEach(el=>io.observe(el));
  }else{items.forEach(el=>el.classList.add('is-visible'))}

  const cfg=window.NOBLE_HART_EMAILJS||{};
  const configured=Boolean(cfg.publicKey&&cfg.serviceId&&cfg.publicKey!=='YOUR_PUBLIC_KEY'&&cfg.serviceId!=='YOUR_SERVICE_ID');

  if(window.emailjs&&configured){
    emailjs.init({publicKey:cfg.publicKey, limitRate:{id:'noble-hart-website', throttle:5000}});
  }

  function setStatus(id,message,type){
    const el=document.getElementById(id);
    if(!el)return;
    el.textContent=message;
    el.className='form-status '+(type||'');
  }

  function setBusy(button,busy,label){
    if(!button)return;
    button.disabled=busy;
    button.setAttribute('aria-busy',String(busy));
    button.dataset.originalText ||= button.innerHTML;
    button.innerHTML=busy ? 'Sending…' : button.dataset.originalText;
  }

  const contactForm=document.getElementById('contactForm');
  if(contactForm){
    contactForm.addEventListener('submit',function(e){
      e.preventDefault();
      const button=document.getElementById('contactSubmit');
      if(!configured||!window.emailjs){
        setStatus('contactStatus','The contact form is not connected yet. Please complete the EmailJS setup in emailjs-config.js.','error');
        return;
      }
      setStatus('contactStatus','Sending your message…','sending');
      setBusy(button,true);
      const form=this;
      emailjs.sendForm(cfg.serviceId,cfg.contactTemplateId,form)
        .then(function(){
          setStatus('contactStatus','Message sent successfully. Thank you — I’ll get back to you as soon as possible.','success');
          form.reset();
        })
        .catch(function(error){
          console.error('EmailJS contact error:',error);
          setStatus('contactStatus','Sorry, your message could not be sent right now. Please try again in a moment.','error');
        })
        .finally(function(){setBusy(button,false)});
    });
  }

  const backToTop=document.getElementById('backToTop');
  if(backToTop){
    const toggleBackToTop=()=>{
      if(window.scrollY>400){backToTop.classList.add('show')}
      else{backToTop.classList.remove('show')}
    };
    toggleBackToTop();
    window.addEventListener('scroll',toggleBackToTop,{passive:true});
    backToTop.addEventListener('click',()=>{
      window.scrollTo({top:0,behavior:'smooth'});
    });
  }

  const newsletterForm=document.getElementById('newsletterForm');
  if(newsletterForm){
    newsletterForm.addEventListener('submit',function(e){
      e.preventDefault();
      const button=document.getElementById('newsletterSubmit');
      if(!configured||!window.emailjs||!cfg.newsletterTemplateId||cfg.newsletterTemplateId==='YOUR_NEWSLETTER_TEMPLATE_ID'){
        setStatus('newsletterStatus','Newsletter signup is not connected yet. Complete the EmailJS newsletter template setup first.','error');
        return;
      }
      setStatus('newsletterStatus','Adding you to the Noble Hart list…','sending');
      setBusy(button,true);
      const form=this;
      emailjs.sendForm(cfg.serviceId,cfg.newsletterTemplateId,form)
        .then(function(){
          setStatus('newsletterStatus','You’re subscribed. Welcome to Noble Hart!','success');
          form.reset();
        })
        .catch(function(error){
          console.error('EmailJS newsletter error:',error);
          setStatus('newsletterStatus','We could not complete the signup right now. Please try again.','error');
        })
        .finally(function(){setBusy(button,false)});
    });
  }
})();
