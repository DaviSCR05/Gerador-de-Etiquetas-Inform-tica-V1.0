function appAlert(message) {
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay')
    const msg = document.getElementById('modalMessage')
    const btns = document.getElementById('modalButtons')
    msg.textContent = message
    btns.innerHTML = `<button class="btn primary">OK</button>`
    btns.querySelector('button').onclick = () => {
      overlay.style.display = 'none'
      resolve()
    }
    overlay.style.display = 'flex'
  })
}

function appConfirm(message) {
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay')
    const msg = document.getElementById('modalMessage')
    const btns = document.getElementById('modalButtons')
    msg.textContent = message
    btns.innerHTML = `
      <button class="btn primary">Sim</button>
      <button class="btn outline">Não</button>
    `
    const [yesBtn, noBtn] = btns.querySelectorAll('button')
    yesBtn.onclick = () => { overlay.style.display = 'none'; resolve(true) }
    noBtn.onclick = () => { overlay.style.display = 'none'; resolve(false) }
    overlay.style.display = 'flex'
  })
}
let counter = parseInt(localStorage.getItem('os_counter')||'1',10)
let osList = JSON.parse(localStorage.getItem('os_list')||'[]')
let dirHandle = null

async function saveDirectoryHandle(handle) {
  if ('storage' in navigator && 'setDirectory' in navigator.storage) {
    await navigator.storage.setDirectory(handle)
  }
}

async function getSavedDirectoryHandle() {
  if ('storage' in navigator && 'getDirectory' in navigator.storage) {
    return await navigator.storage.getDirectory()
  }
  return null
}

async function requestDirectory() {
  if (window.showDirectoryPicker) {
    const handle = await window.showDirectoryPicker()
    await saveDirectoryHandle(handle)
    return handle
  }
  return null
}

async function initDirectory() {
  dirHandle = await getSavedDirectoryHandle()
  if (!dirHandle) {
    dirHandle = await requestDirectory()
    if (dirHandle) {
      storageInfo.textContent = `Salvando: pasta → ${dirHandle.name}`
    }
  } else {
    storageInfo.textContent = `Salvando: pasta → ${dirHandle.name}`
  }
}

const toggleTheme = document.getElementById('toggleTheme')
function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.classList.add('light')
    document.body.classList.add('light')
  } else {
    document.documentElement.classList.remove('light')
    document.body.classList.remove('light')
  }
  localStorage.setItem('theme', theme)
}
toggleTheme.onclick = () => {
  const isLight = document.documentElement.classList.contains('light')
  applyTheme(isLight ? 'dark' : 'light')
}
document.addEventListener('DOMContentLoaded', async () => {
  const savedTheme = localStorage.getItem('theme') || 'dark'
  applyTheme(savedTheme)
  await initDirectory()
})

const btnNova = document.getElementById('btnNova')
const btnVer = document.getElementById('btnVer')
const btnPasta = document.getElementById('btnPasta')
const btnLimpar = document.getElementById('btnLimpar')
const panelForm = document.getElementById('panelForm')
const panelList = document.getElementById('panelList')
const osForm = document.getElementById('osForm')
const listEl = document.getElementById('list')
const storageInfo = document.getElementById('storageInfo')
const counterEl = document.getElementById('counter')
const btnGerarEtiqueta = document.getElementById('btnGerarEtiqueta')
const tipoEl = document.getElementById('tipo')
const extraFields = document.getElementById('extraFields')

function updateCounter(){ counterEl.textContent = `${osList.length} OS` }
function saveLocal(){ localStorage.setItem('os_list', JSON.stringify(osList)); localStorage.setItem('os_counter', String(counter)); updateCounter() }
function renderList(){
  listEl.innerHTML = ''
  if(osList.length===0){ listEl.innerHTML = '<div class="card"><div class="card-meta">Nenhuma OS criada</div></div>'; return }
  osList.forEach(os=>{
    const card = document.createElement('div')
    card.className = 'card'
    card.innerHTML = `<div class="card-head"><div><div class="card-title">OS #${os.id} • ${escapeHtml(os.tipo)}</div><div class="card-meta">${escapeHtml(os.cliente)}</div></div>
      <div class="card-actions">
        <button class="btn" data-id="${os.id}" data-action="print">Etiqueta</button>
        <button class="btn" data-id="${os.id}" data-action="download">Baixar</button>
        <button class="btn" data-id="${os.id}" data-action="delete">Excluir</button>
      </div></div>
      <div class="card-body"><div class="card-meta">${escapeHtml(os.tecnico)} • ${os.testeSSD} ${os.estadoSSD?('• '+escapeHtml(os.estadoSSD)) : ''}</div>
      <div class="card-meta">${short(os.especificacoes,160)}</div></div>`
    listEl.appendChild(card)
  })
  Array.from(document.querySelectorAll('.card .btn')).forEach(b=>{
    b.onclick = async ()=>{
      const id = parseInt(b.dataset.id,10)
      const act = b.dataset.action
      const os = osList.find(o=>o.id===id)
      if(!os) return
      if(act==='print') openPrint(os)
      if(act==='download') downloadJson(os)
      if(act==='delete') {
        const confirmacao = await appConfirm('Excluir OS #'+id+'?')
        if(confirmacao){
          osList = osList.filter(x=>x.id!==id)
          saveLocal()
          renderList()
        }
      }
    }
  })
}

btnNova.onclick = ()=>{ btnNova.classList.add('active'); btnVer.classList.remove('active'); panelForm.style.display='block'; panelList.style.display='none' }
btnVer.onclick = ()=>{ btnVer.classList.add('active'); btnNova.classList.remove('active'); panelForm.style.display='none'; panelList.style.display='block'; renderList() }

btnPasta.onclick = async ()=>{
  try{
    dirHandle = await window.showDirectoryPicker()
    storageInfo.textContent = `Salvando: pasta → ${dirHandle.name}`
    await appAlert('Pasta selecionada: ' + dirHandle.name)
  }catch(e){
    await appAlert('Seleção de pasta cancelada ou API não suportada.')
  }
}

btnLimpar.onclick = async ()=>{
  const confirmacao = await appConfirm('Remover todos os registros locais?')
  if(confirmacao){
    osList = []
    counter = 1
    localStorage.removeItem('os_list')
    localStorage.removeItem('os_counter')
    storageInfo.textContent = 'Salvando: navegador'
    renderList()
    updateCounter()
  }
}

tipoEl.addEventListener('change', ()=>{
  extraFields.innerHTML = ''
  extraFields.style.display = 'none'
  if(tipoEl.value==='SSD' || tipoEl.value==='HD'){
    extraFields.innerHTML = `
      <label class="field"><span>Cliente / Propriedade</span>
        <input id="extraCliente" type="text" placeholder="Nome do cliente ou marque propriedade abaixo" />
        <select id="extraPropriedade">
          <option value="">—</option>
          <option>KM</option>
          <option>Kronna</option>
        </select>
      </label>
      <label class="field"><span>Número de Serial</span><input id="extraSerial" type="text" required /></label>
      <label class="field"><span>Capacidade</span><input id="extraCapacidade" type="text" required /></label>
    `
    extraFields.style.display = 'block'
  }
  if(tipoEl.value==='Roteador'){
    extraFields.innerHTML = `
      <label class="field"><span>Cliente / Propriedade</span>
        <input id="extraCliente" type="text" placeholder="Nome do cliente ou marque propriedade abaixo" />
        <select id="extraPropriedade">
          <option value="">—</option>
          <option>KM</option>
          <option>Kronna</option>
        </select>
      </label>
      <label class="field"><span>Senha de acesso</span><input id="extraSenha" type="text" required /></label>
      <label class="field"><span>Está configurado?</span>
        <select id="extraConfigurado" required>
          <option value="">—</option>
          <option>Sim</option>
          <option>Não</option>
        </select>
      </label>
    `
    extraFields.style.display = 'block'
  }
})

osForm.addEventListener('submit', async (e)=>{
  e.preventDefault()
  const cliente = document.getElementById('cliente').value.trim()
  const tipo = tipoEl.value
  const especificacoes = document.getElementById('especificacoes').value.trim()
  const servicos = document.getElementById('servicos').value.trim()
  const tecnico = document.getElementById('tecnico').value.trim()
  const testeSSD = document.getElementById('testeSSD').value
  const estadoSSD = document.getElementById('estadoSSD').value
  const storage = document.querySelector('input[name="storage"]:checked').value
  let extras = {}
  if(tipo==='SSD' || tipo==='HD'){
    extras = {
      extraCliente: document.getElementById('extraCliente').value.trim(),
      extraPropriedade: document.getElementById('extraPropriedade').value,
      extraSerial: document.getElementById('extraSerial').value.trim(),
      extraCapacidade: document.getElementById('extraCapacidade').value.trim()
    }
  }
  if(tipo==='Roteador'){
    extras = {
      extraCliente: document.getElementById('extraCliente').value.trim(),
      extraPropriedade: document.getElementById('extraPropriedade').value,
      extraSenha: document.getElementById('extraSenha').value.trim(),
      extraConfigurado: document.getElementById('extraConfigurado').value
    }
  }
  if(!cliente || !tipo || !tecnico){ await appAlert('Preencha Cliente, Tipo e Técnico.'); return }
  const os = { id: counter, cliente, tipo, especificacoes, servicos, tecnico, testeSSD, estadoSSD, ...extras, createdAt: new Date().toISOString() }
  osList.unshift(os)
  saveLocal()
  if(storage === 'folder'){
    if(!dirHandle){ await appAlert('Selecione uma pasta clicando em "Selecionar Pasta" antes de salvar na pasta local.'); }
    else{
      try{
        const file = await dirHandle.getFileHandle(`OS-${os.id}.json`, { create: true })
        const writable = await file.createWritable()
        await writable.write(JSON.stringify(os, null, 2))
        await writable.close()
      }catch(err){ await appAlert('Erro ao gravar na pasta: '+err.message) }
    }
  }
  counter++
  localStorage.setItem('os_counter', String(counter))
  osForm.reset()
  extraFields.innerHTML = ''
  extraFields.style.display = 'none'
  await appAlert('OS criada: #' + os.id)
  renderList()
})

btnGerarEtiqueta.onclick = ()=>{
  const cliente = document.getElementById('cliente').value.trim()
  if(!cliente){ appAlert('Preencha ao menos o nome do cliente para gerar etiqueta.'); return }
  const tipo = tipoEl.value
  const especificacoes = document.getElementById('especificacoes').value.trim()
  const servicos = document.getElementById('servicos').value.trim()
  const tecnico = document.getElementById('tecnico').value.trim()
  const testeSSD = document.getElementById('testeSSD').value
  const estadoSSD = document.getElementById('estadoSSD').value
  let extras = {}
  if(tipo==='SSD' || tipo==='HD'){
    extras = {
      extraCliente: document.getElementById('extraCliente').value.trim(),
      extraPropriedade: document.getElementById('extraPropriedade').value,
      extraSerial: document.getElementById('extraSerial').value.trim(),
      extraCapacidade: document.getElementById('extraCapacidade').value.trim()
    }
  }
  if(tipo==='Roteador'){
    extras = {
      extraCliente: document.getElementById('extraCliente').value.trim(),
      extraPropriedade: document.getElementById('extraPropriedade').value,
      extraSenha: document.getElementById('extraSenha').value.trim(),
      extraConfigurado: document.getElementById('extraConfigurado').value
    }
  }
  const os = { id: '—', cliente, tipo, especificacoes, servicos, tecnico, testeSSD, estadoSSD, ...extras, createdAt: new Date().toISOString() }
  openPrint(os)
}

function openPrint(os){
  const html = buildPrintHtml(os)
  const w = window.open('','_blank','width=420,height=620')
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
  w.close()
}

function buildPrintHtml(os){
  const specs = nl2br(escapeHtml(os.especificacoes || '—'))
  const srv = nl2br(escapeHtml(os.servicos || '—'))
  let extrasHtml = ''
  if(os.tipo==='SSD' || os.tipo==='HD'){
    extrasHtml = `<div class="block"><strong>Propriedade:</strong> ${escapeHtml(os.extraPropriedade||'—')}</div>
    <div class="block"><strong>Serial:</strong> ${escapeHtml(os.extraSerial||'—')}</div>
    <div class="block"><strong>Capacidade:</strong> ${escapeHtml(os.extraCapacidade||'—')}</div>`
  }
  if(os.tipo==='Roteador'){
    extrasHtml = `<div class="block"><strong>Propriedade:</strong> ${escapeHtml(os.extraPropriedade||'—')}</div>
    <div class="block"><strong>Senha:</strong> ${escapeHtml(os.extraSenha||'—')}</div>
    <div class="block"><strong>Configurado:</strong> ${escapeHtml(os.extraConfigurado||'—')}</div>`
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>Etiqueta OS ${os.id}</title>
    <style>
      @page { size:80mm 50mm; margin:0; }
      body{margin:0;padding:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#fff}
      .label{width:80mm;height:50mm;padding:8px;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;color:#000;border:1px dashed #000}
      .title{font-weight:800;font-size:14px;text-align:center;margin-bottom:6px}
      .meta{display:flex;justify-content:space-between;font-size:11px;margin-bottom:6px}
      .block{font-size:10px;line-height:1.1;margin-bottom:6px}
      .small{font-size:9px;color:#222}
    </style>
    </head><body><div class="label printable">
      <div class="title">OS Nº ${escapeHtml(String(os.id))}</div>
      <div class="meta"><div><strong>Cliente</strong><div class="small">${escapeHtml(os.cliente)}</div></div>
      <div style="text-align:right"><strong>Tipo</strong><div class="small">${escapeHtml(os.tipo||'—')}</div></div></div>
      <div class="block"><strong> Técnico:</strong> ${escapeHtml(os.tecnico||'—')}</div>
      <div class="block"><strong>SSD:</strong> ${escapeHtml(os.testeSSD||'—')} ${os.estadoSSD?('• '+escapeHtml(os.estadoSSD)):''}</div>
      ${extrasHtml}
      <div class="block"><strong>Especificações:</strong><div class="small">${specs}</div></div>
      <div class="block"><strong>Serviços:</strong><div class="small">${srv}</div></div>
      <div style="position:absolute;bottom:6px;right:8px;font-size:9px;color:#333">Criado: ${new Date(os.createdAt).toLocaleString()}</div>
    </div></body></html>`
}

function downloadJson(os){
  const blob = new Blob([JSON.stringify(os,null,2)],{type:'application/json'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `OS-${os.id}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function escapeHtml(str){ if(!str) return ''; return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
function nl2br(str){ return String(str).replace(/\n/g,'<br/>') }
function short(s,n){ if(!s) return ''; return s.length>n?escapeHtml(s.slice(0,n-1))+'…':escapeHtml(s) }

updateCounter()
renderList()