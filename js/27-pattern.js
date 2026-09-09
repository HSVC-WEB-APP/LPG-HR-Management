/* ============================================================
   PATTERN CA THỰC TẾ   ★ v9.5
   LPGT Cavern — Quản lý Công Ca
   ------------------------------------------------------------
   VIỆC THẬT

   Bảng ca của tổ là 4 nhóm A·B·C·D chạy O O D D N N R R, lệch nhau 2 ngày.
   Đó là CA CHUẨN, và ca chuẩn không đổi khi tổ thiếu người: nó là cái mốc
   để biết ai đang làm đúng lịch, ai đang làm thêm.

   Thiếu người thì bộ phận cho những người CÒN LẠI đổi ca để cover chỗ
   trống. Mất DCS Boardman của nhóm A thì ba boardman kia chạy:

       Nhóm B   D D D N N N R R     6 ngày làm / 2 ngày nghỉ — chỉ ĐỔI CA
       Nhóm C   O D D D N N R R     6 ngày làm / 2 ngày nghỉ — chỉ ĐỔI CA
       Nhóm D   O O D D N N N R     7 ngày làm / 1 ngày nghỉ — MẤT 1 NGÀY NGHỈ

   Cả ba đều là chuỗi 8 ngày lặp lại. Sửa tay từng ô thì một kỳ là 31 ô
   nhân ba người — vừa lâu vừa dễ sót. Nên phải khai được nguyên cái CHUỖI
   ấy cùng ngày bắt đầu áp dụng, phần mềm rải ra cả khoảng.

   NGÀY NGHỈ MÀ ĐI LÀM LÀ TĂNG CA

   Hệ thống nhân sự chỉ biết hai kiểu ca: D-N-R và O-D-N-R. Ngày nghỉ theo
   kiểu ca ấy mà vẫn lên ca thì không có ô nào để ghi, ngoài mã tăng ca.
   Nên khi pattern đặt một ngày làm việc vào đúng ngày CA CHUẨN LÀ R, phần
   mềm ghi thẳng mã OT:

       D → OTD (08–20h)   ·   N → OTN (20–08h)   ·   O → OTO (08–17h)

   Nhóm D ở trên mỗi chu kỳ 8 ngày mất một ngày nghỉ → mỗi chu kỳ một ô OTN.
   Không phải nhớ, không phải khai đơn — nhìn lịch là thấy.

   PATTERN GHI VÀO CA THỰC TẾ, KHÔNG ĐỤNG CA CHUẨN

   S.base giữ nguyên ca chuẩn 4 nhóm. Pattern chỉ ghi ô đè vào S.over, đúng
   như sửa tay từng ô — khác mỗi chỗ là sửa được 31 ô một lần. Ô nào pattern
   trùng ca chuẩn thì GỠ ô đè đi chứ không ghi ô trùng: lịch thực tế phải
   sạch, "khác chuẩn" mới có nghĩa.

   Thông báo đi qua bộ đệm schedHold của js/06-calendar.js: mỗi người nhận
   đúng một việc chờ xác nhận trong app, còn Zalo tốn ĐÚNG MỘT tin gộp.
   ============================================================ */

/* Ngày ca chuẩn là R mà phải đi làm → mã tăng ca tương ứng ca làm */
const PAT_OT={D:'OTD', N:'OTN', O:'OTO'};

/* Mẫu hay dùng. `ot` = mỗi chu kỳ mất mấy ngày nghỉ so với ca chuẩn 8 ngày
   (0 = chỉ đổi ca, không thêm giờ). */
const PAT_PRESETS=[
  {p:'O O D D N N R R', l:'Ca chuẩn 4 nhóm',                       ot:0},
  {p:'D D D N N N R R', l:'Cover ngày+đêm — bỏ 2 ngày hành chính',  ot:0},
  {p:'O D D D N N R R', l:'Cover 1 ca ngày — bỏ 1 ngày hành chính', ot:0},
  {p:'O O D D N N N R', l:'Cover 1 ca đêm — MẤT 1 ngày nghỉ',       ot:1},
  {p:'D D N N R R',     l:'2 ngày · 2 đêm · 2 nghỉ (6 ngày)',       ot:0},
  {p:'O O O O O R R',   l:'Hành chính 5 ngày · 2 nghỉ',             ot:0}
];

/* =================== TÍNH TOÁN =================== */
/* Mã này là ngày NGHỈ CA? (R và các mã cat 'rest' tự khai) */
function patIsRest(c){
  if(!c)return false;
  return (typeof codeInfo==='function')?codeInfo(c).cat==='rest':(c==='R');
}
/* Ô lịch này là MẶT NGƯỜI ở ca nào — gộp mã đổi ca, mã OT trọn ca và ca kép
   về D / N / O. Mã nghỉ, mã phép và mã OT lẻ giờ (OT2, OT3, OTL) trả ''.
   Dùng để đếm quân số của phương án đang xem trước. */
function patShiftOf(code){
  const c=(typeof workCodeOf==='function')?workCodeOf(code):code;
  if(c==='D'||c==='SD'||c==='OTD')return 'D';
  if(c==='N'||c==='SN'||c==='OTN')return 'N';
  if(c==='O'||c==='SO'||c==='OTO')return 'O';
  return '';
}
/* Danh sách ngày trong một khoảng (chặn 400 ngày cho chắc) */
function patDays(from,to){
  const a=[];if(!from||!to||to<from)return a;
  let iso=from,g=0;
  while(iso<=to&&g++<400){a.push(iso);iso=addDaysIso(iso,1);}
  return a;
}
/* MỘT Ô: pattern nói ngày này là ca gì, và so với ca chuẩn thì thành cái gì.
     std   ca chuẩn (S.base)          cur  ca đang hiện trên lịch thực tế
     raw   mã pattern rải ra          code mã sẽ ghi (raw, hoặc mã OT)
     ot    ngày nghỉ mà phải đi làm   back pattern trùng ca chuẩn → gỡ ô đè
     same  không có gì phải đổi       req  ô do đơn đã duyệt ghi ra          */
function patOneCell(e,iso,slots,a0,opt){
  opt=opt||{};
  const empId=e.id;
  if(typeof inServiceOn==='function'&&!inServiceOn(e,iso))return null;
  const std=(S.base[empId]&&S.base[empId][iso])||'';
  const o=S.over[empId]&&S.over[empId][iso];
  const cur=(typeof eff==='function')?eff(empId,iso).code:((o&&o.code)||std);
  const n=slots.length;
  const raw=slots[(((dayNum(iso)-a0)%n)+n)%n];
  let code=raw,ot=false;
  if(patIsRest(std)&&PAT_OT[raw]){code=PAT_OT[raw];ot=true;}
  const req=!!(o&&o.reqId);
  return {empId:empId,iso:iso,std:std,cur:cur,raw:raw,code:code,ot:ot,
          req:req, skip:!!(opt.keepReq&&req),
          back:code===std, same:code===cur};
}
/* CẢ KHOẢNG cho một người. Trả [] nếu pattern không đọc được mã nào —
   KHÔNG rơi về mẫu mặc định: rơi âm thầm là cách chắc nhất để cả tổ nhận
   nhầm lịch mà không ai biết vì sao (cùng nguyên tắc với genForEmp). */
function patCells(empId,pattern,anchor,from,to,opt){
  const out=[];
  const e=(typeof empById==='function')?empById(empId):null;
  if(!e)return out;
  const slots=(typeof parseShiftPattern==='function')?parseShiftPattern(pattern):[];
  if(!slots.length)return out;
  /* Mã lạ cũng phải chặn, không chỉ chuỗi rỗng: parseShiftPattern() cắt được
     "XX YY" thành hai "mã" vì nó chỉ biết cắt, không biết mã nào có thật.
     Rải một mã không tồn tại ra 31 ô là hỏng âm thầm — ô hiện chữ lạ, không
     tính giờ, không ai biết vì sao. */
  if(typeof shiftPatternOk==='function'&&!shiftPatternOk(pattern))return out;
  const a0=dayNum(anchor||from);
  patDays(from,to).forEach(iso=>{
    const c=patOneCell(e,iso,slots,a0,opt);
    if(c)out.push(c);
  });
  return out;
}
/* Gộp nhiều người: [{emp, cells, nChg, nOt, nSkip}] */
function patPlan(ids,pattern,anchor,from,to,opt){
  const rows=[];
  (ids||[]).forEach(id=>{
    const e=empById(id);if(!e)return;
    const cells=patCells(id,pattern,anchor,from,to,opt);
    if(!cells.length)return;
    rows.push({emp:e,cells:cells,
      nChg :cells.filter(c=>!c.skip&&!c.same).length,
      nOt  :cells.filter(c=>!c.skip&&!c.same&&c.ot).length,
      nSkip:cells.filter(c=>c.skip).length});
  });
  return rows;
}
/* Bản đồ "id|iso" → mã ca của PHƯƠNG ÁN đang xem trước, để đếm quân số mà
   không phải ghi thử vào S.over rồi hoàn tác. */
function patProposed(rows){
  const m={};
  (rows||[]).forEach(r=>r.cells.forEach(c=>{
    if(c.skip)return;
    m[c.empId+'|'+c.iso]=c.back?c.std:c.code;
  }));
  return m;
}
/* ĐẾM QUÂN SỐ THEO VỊ TRÍ của phương án — câu hỏi thật của người xếp ca:
   pattern này có bịt được lỗ không, hay lại hở chỗ khác. */
function patCover(days,proposed){
  const emps=(typeof schedEmps==='function')?schedEmps():[];
  return (days||[]).map(iso=>{
    const r={iso:iso,D:{bm:0,fe:0,op:0},N:{bm:0,fe:0,op:0},O:{bm:0,fe:0,op:0}};
    emps.forEach(e=>{
      if(typeof inServiceOn==='function'&&!inServiceOn(e,iso))return;
      const k=e.id+'|'+iso;
      const code=(proposed&&(k in proposed))?proposed[k]:eff(e.id,iso).code;
      const w=patShiftOf(code);if(!w)return;
      const p=(typeof posCode==='function')?posCode(e):'';
      r[w][p==='boardman'?'bm':(p==='field_eng'?'fe':'op')]++;
    });
    return r;
  });
}

/* =================== GHI VÀO LỊCH THỰC TẾ =================== */
/* Ghi cả phương án. Bật chế độ GIỮ thông báo TRƯỚC khi ghi: áp pattern là
   sửa hàng loạt, báo từng ô thì mỗi người nhận cả chục tin, mà lại còn sai
   vì cùng một ô có thể bị đổi hai lần trong một lượt. Ghi xong, người dùng
   bấm Gửi thì Zalo tốn ĐÚNG MỘT tin gộp (schedHoldFlush ở 06-calendar.js).
   Trả {n, nOt, wasOn} — wasOn = trước đó ĐÃ đang giữ (ai đó bật để sửa
   hàng loạt), lúc ấy không được tự gửi hộ, phải để họ gửi cùng lượt. */
function patApply(rows){
  if(typeof canEditSched==='function'&&!canEditSched()){
    toast(t('Bạn không có quyền sửa lịch thực tế'));return null;}
  const list=[];
  (rows||[]).forEach(r=>r.cells.forEach(c=>{if(!c.skip&&!c.same)list.push(c);}));
  if(!list.length){toast(t('Không có ô nào phải đổi'));return null;}
  const h=(typeof schedHold==='function')?schedHold():null;
  const wasOn=!!(h&&h.on);
  if(h&&!h.on){h.on=true;h.by=(typeof meId==='function'&&meId())||'manager';h.at=Date.now();}
  let n=0,nOt=0;
  list.forEach(c=>{
    const oldCode=c.cur;
    const newCode=c.back?c.std:c.code;
    /* Trùng ca chuẩn thì GỠ ô đè — không ghi ô trùng, để "khác chuẩn" còn
       đúng nghĩa. Cùng quy tắc với setCell(null) ở js/06-calendar.js. */
    if(c.back){ if(S.over[c.empId])delete S.over[c.empId][c.iso]; }
    else{
      S.over[c.empId]=S.over[c.empId]||{};
      /* pat:1 — dấu vết "ô này do áp pattern sinh ra", để sau còn lọc/gỡ. */
      S.over[c.empId][c.iso]={code:c.code,
        by:(typeof meId==='function'&&meId())||'manager',at:Date.now(),pat:1};
    }
    if(typeof schedHoldPut==='function')schedHoldPut(c.empId,c.iso,oldCode,newCode,c.std);
    else if(typeof emitSchedChange==='function')emitSchedChange(c.empId,c.iso,oldCode,newCode,c.std,{});
    n++;if(c.ot)nOt++;
  });
  /* Sổ các lượt áp dụng — để còn biết ai đã đổi gì, khi nào */
  S.settings=S.settings||{};
  S.settings.patLog=S.settings.patLog||[];
  S.settings.patLog.push({id:uid(),at:Date.now(),
    by:(typeof meId==='function'&&meId())||'',
    pat:patPat,from:patFrom,to:patTo,anchor:patAnchor,
    who:(rows||[]).map(r=>r.emp.id),n:n,nOt:nOt});
  if(S.settings.patLog.length>60)S.settings.patLog=S.settings.patLog.slice(-60);
  save();
  if(typeof renderHoldBar==='function')renderHoldBar();
  if(typeof renderCal==='function')renderCal();
  return {n:n,nOt:nOt,wasOn:wasOn};
}
/* Gỡ HẾT ô đè trong một khoảng cho những người đang chọn — trả lịch thực tế
   về đúng ca chuẩn. Ô do ĐƠN ĐÃ DUYỆT ghi ra thì giữ nguyên: gỡ nó là xoá
   kết quả duyệt đơn, việc ấy phải làm ở màn Duyệt. */
function patClearRange(ids,from,to){
  if(typeof canEditSched==='function'&&!canEditSched()){
    toast(t('Bạn không có quyền sửa lịch thực tế'));return null;}
  const days=patDays(from,to);
  const h=(typeof schedHold==='function')?schedHold():null;
  const wasOn=!!(h&&h.on);
  if(h&&!h.on){h.on=true;h.by=(typeof meId==='function'&&meId())||'manager';h.at=Date.now();}
  let n=0;
  (ids||[]).forEach(id=>{
    const m=S.over[id];if(!m)return;
    days.forEach(iso=>{
      const o=m[iso];if(!o||o.reqId)return;
      const std=(S.base[id]&&S.base[id][iso])||'';
      const oldCode=o.code||'';
      delete m[iso];
      if(oldCode===std)return;                    /* ô đè trùng chuẩn — không ai cần báo */
      if(typeof schedHoldPut==='function')schedHoldPut(id,iso,oldCode,std,std);
      n++;
    });
  });
  save();
  if(typeof renderHoldBar==='function')renderHoldBar();
  if(typeof renderCal==='function')renderCal();
  return {n:n,wasOn:wasOn};
}

/* =================== TRẠNG THÁI HỘP THOẠI =================== */
let patSel={};              // empId → 1
let patPat='';
let patAnchor='';
let patFrom='', patTo='';
let patKeepReq=true;        // bỏ qua ô do đơn đã duyệt ghi ra
let patShow=false;          // đã bấm Xem trước chưa

function patSelIds(){
  return (typeof schedEmps==='function'?schedEmps():[])
    .filter(e=>patSel[e.id]).map(e=>e.id);
}
function patToggle(id){if(patSel[id])delete patSel[id];else patSel[id]=1;patShow=false;renderPatBox();}
function patSelTeam(tm){
  const list=schedEmps().filter(e=>(e.team||'')===tm);
  const all=list.length&&list.every(e=>patSel[e.id]);
  list.forEach(e=>{if(all)delete patSel[e.id];else patSel[e.id]=1;});
  patShow=false;renderPatBox();
}
function patSelNone(){patSel={};patShow=false;renderPatBox();}
function patSetPat(v){patPat=v;patShow=false;renderPatBox();}
function patSet(f,v){
  if(f==='from'){patFrom=v;if(!patAnchor||patAnchor>v)patAnchor=v;}
  else if(f==='to')patTo=v;
  else if(f==='anchor')patAnchor=v;
  else if(f==='pat')patPat=v;
  else if(f==='keepReq')patKeepReq=!!v;
  patShow=false;renderPatBox();
}
/* Đọc pattern ĐANG CHẠY của một người từ lịch thực tế: lấy chuỗi mã của
   `len` ngày kể từ mốc. Không tự đoán chu kỳ — chỉ người dùng mới biết tổ
   đang chạy chu kỳ 6 hay 8 ngày. */
function patReadFrom(id,len){
  const n=+len||8;
  const a0=patAnchor||patFrom;
  const a=patDays(a0,addDaysIso(a0,n-1)).map(iso=>{
    const c=eff(id,iso).code||'';
    /* Mã OT đọc ngược về ca gốc: pattern là chuỗi CA, mã OT chỉ là cách ghi
       "ca này rơi vào ngày nghỉ". Khai lại pattern có chữ OTN thì lần áp
       sau sẽ so sai. */
    for(const k in PAT_OT)if(PAT_OT[k]===c)return k;
    return c;
  });
  if(!a.length||a.some(x=>!x))return '';
  return a.join(' ');
}
function patUseCurrent(){
  const ids=patSelIds();
  if(ids.length!==1){toast(t('Chọn đúng MỘT người rồi mới đọc được pattern đang chạy'));return;}
  const s=patReadFrom(ids[0],8);
  if(!s){toast(t('Lịch 8 ngày kể từ mốc còn ô trống — chưa đọc được'));return;}
  patPat=s;patShow=false;renderPatBox();
  toast(t('Đã đọc pattern 8 ngày đang chạy'));
}

/* =================== HỘP THOẠI =================== */
function openPatBox(empId){
  if(typeof canEditSched==='function'&&!canEditSched()){
    toast(t('Bạn không có quyền sửa lịch thực tế'));return;}
  /* Khoảng ngày LUÔN kéo về kỳ đang xem trên tab Lịch, không giữ lại lần
     mở trước: mở hộp ở kỳ tháng 10 mà thấy ngày của kỳ tháng 9 là bẫy —
     bấm Ghi xong mới biết vừa sửa nhầm kỳ. Chỗ cần khoảng khác
     (patFromCell) tự đặt lại NGAY SAU khi gọi hàm này. */
  const ym=($('calMonth')&&$('calMonth').value)||
           (typeof curSchedMonth==='function'?curSchedMonth():'');
  const p=(typeof periodFor==='function'&&ym)?periodFor(ym):null;
  patFrom=p?p.from:todayIso();patTo=p?p.to:todayIso();patAnchor=patFrom;
  if(empId){patSel={};patSel[empId]=1;}
  patShow=false;
  const m=$('patMask');if(!m)return;
  m.classList.add('on');
  renderPatBox();
}
function closePatBox(){const m=$('patMask');if(m)m.classList.remove('on');}
/* Mở hộp Áp pattern NGAY TỪ Ô LỊCH đang sửa: chọn sẵn đúng người, đặt "Từ
   ngày" và mốc vào chính ngày vừa bấm, "Đến ngày" là hết kỳ. Người dùng
   đang nhìn ô nào thì khai từ ô ấy — không phải đóng hộp, lên thanh công
   cụ, rồi gõ lại ngày tháng. */
function patFromCell(){
  if(typeof curCell==='undefined'||!curCell)return;
  const empId=curCell.empId, iso=curCell.iso;
  if(typeof closeCell==='function')closeCell();
  openPatBox(empId);
  /* ĐẶT SAU openPatBox(): hàm ấy vừa kéo khoảng về cả kỳ, mà ở đây người
     dùng muốn bắt đầu đúng từ ô vừa bấm. */
  const per=(typeof periodFor==='function'&&typeof schedMonthOf==='function')
            ?periodFor(schedMonthOf(iso)):null;
  patFrom=iso;patAnchor=iso;
  patTo=(per&&per.to>iso)?per.to:iso;
  patShow=false;renderPatBox();
}

function patPeopleHtml(){
  const emps=(typeof schedEmps==='function'?schedEmps():[])
    .filter(e=>typeof inServiceRange!=='function'||inServiceRange(e,patFrom,patTo));
  const byTeam={},order=[];
  emps.forEach(e=>{const tm=e.team||'';if(!byTeam[tm]){byTeam[tm]=[];order.push(tm);}byTeam[tm].push(e);});
  const gaps=(typeof stdGapsAll==='function')?stdGapsAll(patFrom):[];
  const gapOf=tm=>{const g=gaps.find(x=>x.team===tm);return g?g.miss:[];};
  return order.map(tm=>{
    const miss=gapOf(tm);
    return `<div class="pat-team">
      <div class="pat-tm">
        <button class="btn sec sm" onclick="patSelTeam('${esc(tm)}')">${
          tm?esc(t('Nhóm')+' '+tm):esc(t('(chưa phân nhóm)'))}</button>
        ${miss.length?`<span class="pat-gap">⚠ ${t('thiếu')} ${
          miss.map(x=>t(x==='boardman'?'DCS Boardman':'Field Engineer')).join(' + ')}</span>`:''}
      </div>
      <div class="pat-ppl">${byTeam[tm].map(e=>{
        const p=(typeof posCode==='function')?posCode(e):'';
        const short=p==='boardman'?'DCS':p==='field_eng'?'FE':(p==='operator'?'OP':'');
        return `<button class="pat-p${patSel[e.id]?' on':''}" onclick="patToggle('${e.id}')">
          <b>${esc(e.name||e.id)}</b>${short?`<i>${short}</i>`:''}</button>`;
      }).join('')}</div>
    </div>`;
  }).join('');
}
function patPresetHtml(){
  const cur=(typeof shiftPatternLabel==='function')?shiftPatternLabel(patPat):'';
  return PAT_PRESETS.map(x=>`<button class="pat-pre${
      (cur&&typeof shiftPatternLabel==='function'&&cur===shiftPatternLabel(x.p))?' on':''}"
      onclick="patSetPat('${x.p}')" title="${esc(t(x.l))}">
      <b>${esc(x.p)}</b><i>${esc(t(x.l))}${x.ot?' · '+t('có OT'):''}</i></button>`).join('');
}
/* Bảng xem trước và băng quân số dùng CHUNG một khung cuộn và CHUNG một
   bộ chiều rộng cột — hai bảng cuộn rời nhau thì cột ngày lệch nhau, nhìn
   số quân của ngày 25 lại là cột ngày 21, tệ hơn là không có băng ấy. */
const PAT_W_NAME=132, PAT_W_CHG=64, PAT_W_DAY=30;
function patColsHtml(n){
  return `<colgroup><col style="width:${PAT_W_NAME}px"><col style="width:${PAT_W_CHG}px">`+
         `<col style="width:${PAT_W_DAY}px">`.repeat(n)+`</colgroup>`;
}
function patTableW(n){return PAT_W_NAME+PAT_W_CHG+n*PAT_W_DAY;}

/* Bảng xem trước: mỗi người một dòng, mỗi ngày một ô.
     ô mờ    = không đổi gì          ô màu   = đổi ca (làm → làm)
     ô OT    = ca chuẩn là R mà phải đi làm
     ô gạch  = bỏ qua vì đã có đơn duyệt                              */
function patPrevHtml(rows,days){
  if(!rows.length)return `<p class="muted" style="padding:14px">${
    t('Chưa chọn người, hoặc pattern chưa đọc được mã ca nào.')}</p>`;
  let h=`<table class="pat-prev" style="width:${patTableW(days.length)}px">${
    patColsHtml(days.length)}<thead><tr><th class="pn">${
    t('Người')}</th><th class="pc">${t('Đổi')}</th>`;
  days.forEach(iso=>{h+=`<th>${+iso.slice(8)}<i>${dowOf(iso)}</i></th>`;});
  h+='</tr></thead><tbody>';
  rows.forEach(r=>{
    const m={};r.cells.forEach(c=>{m[c.iso]=c;});
    h+=`<tr><td class="pn"><b>${esc(r.emp.name||r.emp.id)}</b><i>${
      esc(r.emp.team?t('Nhóm')+' '+r.emp.team:'')}</i></td>`+
      `<td class="pc">${r.nChg}${r.nOt?`<b class="ot">+${r.nOt} OT</b>`:''}${
        r.nSkip?`<i>${r.nSkip} ${t('bỏ')}</i>`:''}</td>`;
    days.forEach(iso=>{
      const c=m[iso];
      if(!c){h+='<td class="off"></td>';return;}
      const cls=c.skip?'skip':(c.same?'same':(c.ot?'ot':'chg'));
      const tit=`${fmtVNfull(iso)} · ${t('chuẩn')}: ${c.std||'—'} → ${c.code||'—'}`+
                (c.skip?' · '+t('bỏ qua: đã có đơn duyệt'):'')+
                (c.ot?' · '+t('ngày nghỉ mà đi làm → tính tăng ca'):'');
      const st=(typeof cellStyle==='function'&&!c.same)?cellStyle(c.code):'';
      h+=`<td class="${cls}" style="${st}" title="${esc(tit)}">${esc(c.code||'')}</td>`;
    });
    h+='</tr>';
  });
  h+='</tbody></table>';
  return h;
}
/* Băng quân số của phương án — ô đỏ là ngày còn hở. Không vẽ lại hàng số
   ngày: bảng trên đã có, và hai bảng dùng chung cột nên nhìn thẳng xuống
   là đúng ngày. */
function patCoverHtml(rows,days){
  const cov=patCover(days,patProposed(rows));
  const minD=(S.settings&&+S.settings.minD)||0, minN=(S.settings&&+S.settings.minN)||0;
  let h=`<table class="pat-cov" style="width:${patTableW(days.length)}px">${
    patColsHtml(days.length)}<tbody>`;
  [['D',t('Ca ngày D')],['N',t('Ca đêm N')]].forEach(function(x){
    const k=x[0],lbl=x[1];
    h+=`<tr><td class="pn" colspan="2">${lbl}</td>`;
    cov.forEach(r=>{
      const c=r[k],tot=c.bm+c.fe+c.op;
      const need=(k==='D')?minD:minN;
      const bad=(need&&tot<need)||!c.bm;      /* không có DCS Boardman = hở */
      h+=`<td class="${bad?'bad':''}" title="${esc(
        tot+' '+t('người')+' · DCS '+c.bm+' · FE '+c.fe+' · OP '+c.op)}">${tot}<i>${c.bm}</i></td>`;
    });
    h+='</tr>';
  });
  h+='</tbody></table>';
  return h;
}

function renderPatBox(){
  const box=$('patBody');if(!box)return;
  const ids=patSelIds();
  const okPat=(typeof shiftPatternOk==='function')?shiftPatternOk(patPat):false;
  const slots=(typeof parseShiftPattern==='function')?parseShiftPattern(patPat):[];
  const days=patDays(patFrom,patTo);
  const rows=(patShow&&okPat&&ids.length)
    ? patPlan(ids,patPat,patAnchor,patFrom,patTo,{keepReq:patKeepReq}) : [];
  const nChg =rows.reduce((s,r)=>s+r.nChg ,0);
  const nOt  =rows.reduce((s,r)=>s+r.nOt  ,0);
  const nSkip=rows.reduce((s,r)=>s+r.nSkip,0);
  box.innerHTML=`
  <h3>🔁 ${t('Áp pattern vào ca thực tế')}
    <span style="flex:1"></span>
    <button class="btn sec sm" onclick="closePatBox()">✕</button></h3>
  <p class="muted sm2" style="margin:-4px 0 12px">${
    t('Ca chuẩn 4 nhóm giữ nguyên. Pattern chỉ ghi ô đè lên LỊCH THỰC TẾ. Ngày ca chuẩn là R mà pattern bắt đi làm sẽ tự ghi mã tăng ca OTD / OTN / OTO.')}</p>

  <div class="pat-grid">
    <label class="fl">${t('Từ ngày')}
      <input type="date" class="inp sm" value="${patFrom}" onchange="patSet('from',this.value)"></label>
    <label class="fl">${t('Đến ngày')}
      <input type="date" class="inp sm" value="${patTo}" onchange="patSet('to',this.value)"></label>
    <label class="fl">${t('Mốc bắt đầu chu kỳ')}
      <input type="date" class="inp sm" value="${patAnchor}" onchange="patSet('anchor',this.value)"></label>
    <div class="fl pat-nd"><span>${days.length}</span> ${t('ngày')}</div>
  </div>
  <p class="muted sm2">${t('Mốc = ngày ứng với mã ĐẦU TIÊN của pattern. Để mốc trước "Từ ngày" cũng được — phần mềm vẫn tính đúng vị trí trong chu kỳ.')}</p>

  <div class="pat-sec">
    <div class="pat-h">1️⃣ ${t('Chọn người')} ${ids.length?`<b>${ids.length}</b>`:''}
      <span style="flex:1"></span>
      ${ids.length?`<button class="btn sec sm" onclick="patSelNone()">${t('Bỏ chọn hết')}</button>`:''}</div>
    ${patPeopleHtml()}
  </div>

  <div class="pat-sec">
    <div class="pat-h">2️⃣ ${t('Pattern')}
      ${slots.length?`<span class="pat-len">${slots.length} ${t('ngày/chu kỳ')} · ${
        (typeof shiftPatternLabel==='function')?shiftPatternLabel(patPat):''}</span>`:''}
      <span style="flex:1"></span>
      <button class="btn sec sm" onclick="patUseCurrent()"
        title="${esc(t('Đọc 8 ngày kể từ mốc trên lịch thực tế của người đang chọn'))}">${
        t('Đọc pattern đang chạy')}</button></div>
    <input class="inp" id="patPatBox" style="font-weight:800;letter-spacing:1px"
      placeholder="${esc(t('Ví dụ: D D D N N N R R'))}"
      value="${esc(patPat)}" onchange="patSet('pat',this.value)">
    ${patPat&&!okPat?`<p class="pat-err">⚠ ${
      t('Pattern có mã lạ — chỉ dùng các mã ca đã khai (O · D · N · R …), cách nhau bằng dấu cách.')}</p>`:''}
    <div class="pat-pres">${patPresetHtml()}</div>
  </div>

  <div class="pat-sec">
    <div class="pat-h">3️⃣ ${t('Xem trước rồi mới ghi')}
      <label class="pat-ck"><input type="checkbox" ${patKeepReq?'checked':''}
        onchange="patSet('keepReq',this.checked)"> ${t('Giữ nguyên ô đã có đơn duyệt')}</label>
      <span style="flex:1"></span>
      <button class="btn sm" onclick="patShow=true;renderPatBox()"
        ${(!ids.length||!okPat)?'disabled':''}>👁 ${t('Xem trước')}</button></div>
    ${patShow?`
      <div class="pat-sum${nChg?'':' zero'}">
        <b>${nChg}</b> ${t('ô sẽ đổi')}
        ${nOt?` · <b class="ot">${nOt}</b> ${t('ngày tính TĂNG CA')}`:''}
        ${nSkip?` · <i>${nSkip} ${t('ô bỏ qua vì đã có đơn duyệt')}</i>`:''}
      </div>
      <div class="pat-prevwrap">${patPrevHtml(rows,days)}${
        rows.length?patCoverHtml(rows,days):''}</div>
      ${rows.length?`<p class="muted sm2">${
        t('Số lớn = tổng người trực ca đó · số nhỏ = số DCS Boardman. Ô đỏ = dưới định mức hoặc không có DCS Boardman nào.')}</p>`:''}`
    :`<p class="muted sm2" style="padding:8px 0">${
      t('Bấm Xem trước để đối chiếu từng ô với ca chuẩn trước khi ghi. Không có gì được ghi cho tới khi bấm nút cuối.')}</p>`}
  </div>

  <div class="row" style="margin-top:14px;gap:8px">
    <button class="btn sec" onclick="patDoClear()"
      title="${esc(t('Xoá mọi ô đè trong khoảng đã chọn, trả lịch thực tế về ca chuẩn'))}"
      ${ids.length?'':'disabled'}>↩︎ ${t('Trả về ca chuẩn')}</button>
    <span style="flex:1"></span>
    <button class="btn sec" onclick="closePatBox()">${t('Đóng')}</button>
    <button class="btn ok" onclick="patDoApply()" ${(patShow&&nChg)?'':'disabled'}>💾 ${
      t('Ghi vào ca thực tế')}${nChg?` (${nChg})`:''}</button>
  </div>`;
  if(typeof i18nApply==='function')i18nApply();
}

/* =================== NÚT GHI =================== */
function patDoApply(){
  const ids=patSelIds();
  const rows=patPlan(ids,patPat,patAnchor,patFrom,patTo,{keepReq:patKeepReq});
  const nChg=rows.reduce((s,r)=>s+r.nChg,0);
  const nOt =rows.reduce((s,r)=>s+r.nOt ,0);
  if(!nChg){toast(t('Không có ô nào phải đổi'));return;}
  if(!confirm(t('Ghi')+' '+nChg+' '+t('ô vào lịch thực tế của')+' '+rows.length+' '+t('người')+'?'
    +(nOt?'\n'+nOt+' '+t('ngày rơi vào ngày nghỉ của ca chuẩn — sẽ ghi mã TĂNG CA.'):'')))return;
  const res=patApply(rows);
  if(!res)return;
  patShow=false;
  closePatBox();
  /* Đã đang giữ thông báo từ trước (ai đó bật để sửa hàng loạt) → không tự
     gửi hộ; băng đỏ sẽ nhắc họ gửi cùng lượt của họ. */
  if(res.wasOn){
    toast(t('Đã ghi')+' '+res.n+' '+t('ô — đang GIỮ thông báo, bấm Gửi khi xong'));
    return;
  }
  const people=(typeof schedHoldPeople==='function')?schedHoldPeople():rows.length;
  if(typeof schedHoldFlush==='function'&&
     confirm(t('Đã ghi')+' '+res.n+' '+t('ô')+(res.nOt?' ('+res.nOt+' '+t('ngày OT')+')':'')+'.\n'
       +t('Gửi thông báo cho')+' '+people+' '+t('người ngay bây giờ?')+'\n'
       +t('Zalo chỉ tốn 1 tin gộp; trong app mỗi người nhận đúng một việc chờ xác nhận.'))){
    schedHoldFlush();
  }else{
    toast(t('Đã ghi lịch — thông báo đang GIỮ, bấm 🔔 Gửi thông báo khi xong'));
    if(typeof renderHoldBar==='function')renderHoldBar();
  }
}
function patDoClear(){
  const ids=patSelIds();
  if(!ids.length){toast(t('Chưa chọn người'));return;}
  if(!confirm(t('Xoá mọi ô đè từ')+' '+fmtVNfull(patFrom)+' '+t('đến')+' '+fmtVNfull(patTo)
    +' '+t('của')+' '+ids.length+' '+t('người, trả lịch thực tế về ca chuẩn?')
    +'\n'+t('Ô do đơn đã duyệt ghi ra sẽ được giữ nguyên.')))return;
  const res=patClearRange(ids,patFrom,patTo);
  if(!res||!res.n){toast(t('Không có ô đè nào để xoá'));return;}
  patShow=false;renderPatBox();
  if(res.wasOn){toast(t('Đã trả')+' '+res.n+' '+t('ô về ca chuẩn — đang GIỮ thông báo'));return;}
  if(typeof schedHoldFlush==='function'&&
     confirm(t('Đã trả')+' '+res.n+' '+t('ô về ca chuẩn.')+'\n'+t('Gửi thông báo ngay?')))schedHoldFlush();
  else toast(t('Đã trả')+' '+res.n+' '+t('ô về ca chuẩn — thông báo đang GIỮ'));
}
