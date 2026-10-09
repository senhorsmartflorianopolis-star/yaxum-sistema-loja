/* YAXUM · demonstração da Galeria Protegida */
(function () {
  var root = document.getElementById("gpDemo");
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var msgs = $("gpMsgs"), steps = $("gpSteps"), log = $("gpLog"), timeline = $("gpTimeline"), gallery = $("gpGallery"), badge = $("gpBadge");
  var bAtivar = $("gpAtivar"), bIniciar = $("gpIniciar"), bEntregar = $("gpEntregar"), bSenha = $("gpSenha");
  var sheet = $("gpSheet"), check = $("gpCheck"), confirmBtn = $("gpConfirm"), input = $("gpIn");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DEV = {
    samsung: { nome: "Galaxy S23", metodo: "Modo de manutenção", detalhe: "Fotos, vídeos, mensagens e histórico ficam escondidos. O cliente não precisa passar a senha.", passo: "Modo de manutenção ativo", senha: false },
    iphone: { nome: "iPhone 13", metodo: "Senha só se o teste exigir", detalhe: "O iPhone não tem modo que esconda a galeria. A senha entra só pelo link seguro, e cada desbloqueio aparece para o cliente.", passo: "Senha recebida pelo link seguro", senha: true }
  };
  var ACEITES = ["aceito", "concordo", "ok", "okay", "de acordo", "sim aceito", "sim, aceito", "li e concordo", "aceito sim", "sim concordo"];
  var st, clock;
  function hhmm() { clock += 1 + (clock % 3 === 0 ? 1 : 0); var h = 14 + Math.floor((30 + clock) / 60), m = (30 + clock) % 60; return h + ":" + ("0" + m).slice(-2); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fold(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ,]/g, " ").replace(/\s+/g, " ").trim(); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, reduce ? 60 : ms); }); }
  function scroll() { msgs.scrollTop = msgs.scrollHeight; }
  function bubble(html, who, cls) {
    var p = document.createElement("p");
    p.className = "msg " + (who === "loja" ? "out" : "in") + (cls ? " " + cls : "");
    p.innerHTML = html + "<time>" + hhmm() + (who === "loja" ? " · YAXUM" : "") + "</time>";
    msgs.appendChild(p); scroll(); return p;
  }
  function sys(t) { var p = document.createElement("p"); p.className = "sys"; p.textContent = t; msgs.appendChild(p); scroll(); }
  function loja(list) {
    var c = Promise.resolve();
    list.forEach(function (h) { c = c.then(function () { return wait(500 + Math.min(900, h.length * 6)); }).then(function () { bubble(h, "loja"); }); });
    return c;
  }
  function tl(t, at) { var li = document.createElement("li"); li.innerHTML = "<time>" + (at || hhmm()) + "</time>" + esc(t); timeline.appendChild(li); }
  function setStep(name, cls) { var li = steps.querySelector('[data-s="' + name + '"]'); if (li) { li.classList.remove("is-now", "is-done", "is-off"); if (cls) li.classList.add(cls); } }
  function note(t) { log.textContent = t; }
  function termButtons() {
    var d = document.createElement("div"); d.className = "gp-btns";
    d.innerHTML = '<button type="button" data-act="aceito">Li e concordo</button><button type="button" data-act="ler">Ler o termo</button><button type="button" data-act="recuso">Não aceito</button>';
    msgs.appendChild(d); scroll(); return d;
  }
  function lockButtons() { Array.prototype.forEach.call(msgs.querySelectorAll(".gp-btns button"), function (b) { if (b.getAttribute("data-act") !== "ler") b.disabled = true; }); }

  function renderDevice() {
    var d = DEV[st.dev];
    $("gpMethod").innerHTML = "<b>" + esc(d.metodo) + "</b><span>" + esc(d.detalhe) + "</span><small>Aparelho: " + esc(d.nome) + "</small>";
    $("gpStepProt").textContent = d.passo;
    $("gpTermMethod").textContent = "Método de proteção: " + d.metodo + ".";
    Array.prototype.forEach.call(root.querySelectorAll("[data-dev]"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-dev") === st.dev)); b.disabled = st.phase !== "idle"; });
  }
  function reset() {
    st = { dev: st ? st.dev : "samsung", phase: "idle", senha: false };
    clock = 0;
    msgs.innerHTML = ""; timeline.innerHTML = "<li><time>14:30</time>Aparelho recebido na loja</li>";
    ["termo", "aceite", "protecao", "bancada", "entrega"].forEach(function (s) { setStep(s, null); });
    gallery.classList.remove("is-locked"); badge.className = "gp-badge"; badge.textContent = "Galeria ainda não protegida";
    $("gpBenchPill").textContent = "aguardando"; $("gpTrackPill").textContent = "link do cliente";
    bAtivar.hidden = false; bAtivar.disabled = false; bIniciar.disabled = true; bIniciar.hidden = false; bEntregar.hidden = true; bSenha.hidden = true;
    sheet.hidden = true; check.checked = false; confirmBtn.disabled = true;
    note("Escolha o aparelho e toque em Ativar Galeria Protegida.");
    sys("Demonstração: você é o cliente. Responda com os botões, escrevendo ou mandando um áudio.");
    renderDevice();
  }

  function ativar() {
    if (st.phase !== "idle") return;
    st.phase = "waiting"; renderDevice(); bAtivar.hidden = true;
    setStep("termo", "is-now"); note("Termo enviado. A bancada só libera depois do aceite por escrito.");
    tl("Galeria Protegida acionada pelo técnico");
    loja([
      "Oi! Antes de começar o conserto do seu " + DEV[st.dev].nome + ", vamos ativar a Galeria Protegida 🔒",
      "Funciona assim: o técnico testa o aparelho sem abrir suas fotos, conversas e apps, e você acompanha tudo ao vivo pelo link da Ordem de Serviço.",
      "Pela Lei de Proteção de Dados (LGPD), preciso da sua autorização por escrito. Usamos o acesso só para testar e consertar, ninguém abre galeria ou apps de banco, e você pode revogar quando quiser. Toque em Li e concordo ou escreva ACEITO."
    ]).then(function () { setStep("termo", "is-done"); if (st.phase !== "waiting") return; termButtons(); setStep("aceite", "is-now"); $("gpBenchPill").textContent = "aguardando aceite"; });
  }
  function aceitar(canal, texto) {
    if (st.phase !== "waiting") return;
    st.phase = "accepted"; lockButtons(); sheet.hidden = true;
    var hora = hhmm();
    setStep("aceite", "is-done");
    note("Aceite registrado: canal " + canal + (texto ? " (“" + texto + "”)" : "") + ", " + hora + ", termo v1 com hash, número do WhatsApp.");
    tl("Termo aceito por escrito (" + canal + ")", hora);
    badge.className = "gp-badge is-on"; badge.textContent = "Galeria protegida · aceite " + hora;
    gallery.classList.add("is-locked"); $("gpTrackPill").textContent = "privacidade ativa";
    var list = ["Pronto, aceite registrado às " + hora + " 🔒 A Galeria Protegida está ativa. Você acompanha a bancada ao vivo pelo link da Ordem de Serviço."];
    if (DEV[st.dev].senha) {
      list.push("Pra testar a câmera, o técnico vai precisar desbloquear uma vez. Digite a senha só no campo seguro do link que te mandei. Não mande a senha aqui na conversa, tá?");
      setStep("protecao", "is-now"); bSenha.hidden = false; bIniciar.disabled = true;
      note("Aceite registrado. Aguardando a senha pelo link seguro (ou teste na retirada).");
    } else {
      setStep("protecao", "is-done"); tl("Modo de manutenção ativo: fotos e conversas escondidas"); bIniciar.disabled = false;
      $("gpBenchPill").textContent = "pronta";
    }
    loja(list);
  }
  function senhaRecebida() {
    if (st.phase !== "accepted" || st.senha) return;
    st.senha = true; bSenha.hidden = true; setStep("protecao", "is-done"); bIniciar.disabled = false; $("gpBenchPill").textContent = "pronta";
    tl("Senha recebida pelo link seguro (criptografada)");
    note("Senha guardada criptografada. Cada vez que o técnico tocar em Ver senha, fica registrado.");
  }
  function recusar() {
    if (st.phase !== "waiting") return;
    st.phase = "refused"; lockButtons();
    setStep("aceite", "is-off"); setStep("protecao", "is-off");
    badge.className = "gp-badge is-off"; badge.textContent = "Sem acesso ao aparelho";
    tl("Cliente preferiu não aceitar: conserto sem acesso");
    bIniciar.disabled = false; $("gpBenchPill").textContent = "sem acesso";
    note("Sem aceite: a bancada segue sem desbloquear o aparelho, e os testes ficam para a retirada.");
    loja(["Tudo bem, sem problema! Fazemos o conserto sem acessar o aparelho, e na retirada você testa junto com o técnico.", "Se mudar de ideia, é só escrever ACEITO."]);
  }
  function revogar() {
    if (st.phase !== "accepted" && st.phase !== "bench") { loja(["Não tem nenhum consentimento ativo pra revogar agora 🙂"]); return; }
    st.phase = "refused"; st.senha = false;
    gallery.classList.add("is-locked"); badge.className = "gp-badge is-off"; badge.textContent = "Consentimento revogado";
    setStep("protecao", "is-off"); setStep("bancada", null); bSenha.hidden = true; bIniciar.disabled = false; bIniciar.hidden = false; bEntregar.hidden = true;
    tl("Consentimento revogado pelo cliente");
    note("Revogado (LGPD, art. 8º, § 5º): a senha foi apagada e os testes que dependiam do acesso pararam.");
    loja(["Pronto, consentimento revogado. A senha foi apagada e o técnico parou os testes que dependiam do acesso.", "Como prefere terminar: vem desbloquear aqui ou testa com a gente na retirada?"]);
  }
  function iniciar() {
    if (bIniciar.disabled) return;
    var semAcesso = st.phase === "refused";
    st.phase = "bench"; bIniciar.hidden = true; bEntregar.hidden = false; bSenha.hidden = true;
    setStep("bancada", "is-done"); $("gpBenchPill").textContent = "gravando";
    tl(semAcesso ? "Bancada iniciada sem acesso ao aparelho · gravando" : "Bancada iniciada · gravando ao vivo");
    if (DEV[st.dev].senha && st.senha) tl("Aparelho desbloqueado para teste de câmera");
    note("Bancada gravando. O cliente vê cada etapa e cada desbloqueio no acompanhamento.");
    if (semAcesso) st.phase = "bench-sem";
  }
  function entregar() {
    setStep("entrega", "is-done"); bEntregar.hidden = true; $("gpBenchPill").textContent = "entregue";
    var sem = st.phase === "bench-sem", nome = DEV[st.dev].nome;
    if (sem) { tl("Entregue · testes feitos junto com o cliente"); note("Entregue sem acesso ao aparelho: o cliente testou junto na retirada."); loja(["Seu " + nome + " está pronto! Na retirada você testa junto com o técnico."]); }
    else if (DEV[st.dev].senha) { tl("Entregue · senha apagada automaticamente"); note("Ordem de Serviço entregue. A senha foi apagada e o aceite continua guardado como prova."); loja(["Seu " + nome + " está pronto! Como combinado, a senha que estava no sistema foi apagada agora."]); }
    else { tl("Entregue · cliente saiu do Modo de manutenção com a própria senha"); note("Entregue. O cliente sai do Modo de manutenção com a própria senha, e o que foi criado no conserto é apagado."); loja(["Seu " + nome + " está pronto! Na retirada a gente te mostra como sair do Modo de manutenção com a sua senha."]); }
    st.phase = "done";
  }
  function audio() {
    var p = bubble('<span class="gp-wave" aria-label="Mensagem de voz">' + [8, 14, 10, 16, 6, 12, 15, 9, 13, 7].map(function (h) { return '<i style="height:' + h + 'px"></i>'; }).join("") + "</span> 0:04", "cliente", "gp-audio");
    p.setAttribute("aria-label", "Mensagem de voz do cliente");
    if (st.phase === "waiting") {
      note("Áudio recebido e recusado como aceite: a prova do consentimento precisa ser por escrito.");
      loja(["Recebi seu áudio, obrigada! Mas o aceite do termo precisa ser por escrito, pra ficar registrado certinho.", "Pode tocar em Li e concordo ou escrever ACEITO?"]);
    } else loja(["Recebi seu áudio! Pode me escrever aqui o que precisa? Assim a equipe vê certinho."]);
  }
  function texto(t) {
    t = String(t || "").trim().slice(0, 120); if (!t) return;
    bubble(esc(t), "cliente");
    var f = fold(t);
    if (/^revog/.test(f)) return revogar();
    if (st.phase === "waiting") {
      if (ACEITES.indexOf(f.replace(/[,]/g, "").trim()) >= 0) return aceitar("texto", t);
      if (/^(nao|nao aceito|nao quero|recuso)\b/.test(f)) return recusar();
      note("Resposta sem aceite claro: o sistema pede de novo, por escrito.");
      return loja(["Só pra eu registrar do jeito certo: você concorda com o termo de privacidade? Toque em Li e concordo ou escreva ACEITO."]);
    }
    if (st.phase === "idle") return loja(["Oi! Assim que o técnico ativar a Galeria Protegida, eu te mando o termo por aqui."]);
    if (/\d{4,}/.test(t)) return loja(["Recebi, mas por segurança vou apagar essa mensagem daqui. A senha vai só no campo seguro do link, tá? Pode apagar do seu lado também."]);
    loja(["Anotado! Qualquer dúvida sobre o conserto, é só chamar."]);
  }

  root.addEventListener("click", function (ev) {
    var dev = ev.target.closest("[data-dev]");
    if (dev && st.phase === "idle") { st.dev = dev.getAttribute("data-dev"); renderDevice(); return; }
    var act = ev.target.closest(".gp-btns button");
    if (act && !act.disabled) {
      var a = act.getAttribute("data-act");
      if (a === "ler") { sheet.hidden = false; check.focus(); return; }
      bubble(esc(act.textContent), "cliente");
      if (a === "aceito") aceitar("botão Li e concordo");
      else recusar();
      return;
    }
    var q = ev.target.closest(".gp-quick button");
    if (q) { if (q.hasAttribute("data-audio")) audio(); else texto(q.getAttribute("data-say")); }
  });
  bAtivar.addEventListener("click", ativar);
  bIniciar.addEventListener("click", iniciar);
  bEntregar.addEventListener("click", entregar);
  bSenha.addEventListener("click", senhaRecebida);
  $("gpReset").addEventListener("click", function () { st.dev = st.dev || "samsung"; reset(); });
  $("gpSheetX").addEventListener("click", function () { sheet.hidden = true; });
  check.addEventListener("change", function () { confirmBtn.disabled = !check.checked; });
  confirmBtn.addEventListener("click", function () { if (check.checked) aceitar("caixinha no link"); });
  $("gpForm").addEventListener("submit", function (ev) { ev.preventDefault(); var v = input.value; input.value = ""; texto(v); });
  reset();
})();
