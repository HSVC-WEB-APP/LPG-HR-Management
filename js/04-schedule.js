/* ============================================================
   KY CONG (21->20) + BO SINH LICH CA
   LPGT Cavern — Quan ly Cong Ca v4
   ============================================================ */
/* =================== SCHEDULE PERIOD (21 → 20) =================== */
// A "schedule month" YM = 'YYYY-MM' (kỳ tháng N) = Hyosung period: 21/(N-1) → 20/N.
// Ví dụ: kỳ Tháng 7 = 21/06 → 20/07.
/* Nhãn ngắn của kỳ công — đổi theo ngôn ngữ (xem js/14-i18n.js) */
function periodShort(m,y){return isEN()?`Period M${m}/${y}`:`Kỳ T${m}/${y}`;}
function periodFor(ym){
  const[y,m]=ym.split('-').map(Number);
  const pm=m===1?12:m-1, py=m===1?y-1:y;
  const from=`${py}-${pad(pm)}-21`;
  const to=`${y}-${pad(m)}-20`;
  /* label = bản đầy đủ, dùng cho tiêu đề báo cáo, file Excel, email.
     slim  = bỏ chữ "Kỳ" / "Period" ở đầu, dùng cho các Ô CHỌN trong thanh lọc —
             chỗ đó hẹp, để nguyên chữ là bị cắt mất phần ngày phía sau. */
  return {from,to,y,m,pm,py,short:periodShort(m,y),
          label:`${periodShort(m,y)} · 21/${pad(pm)} → 20/${pad(m)}`,
          slim :`${isEN()?'M':'T'}${m}/${y} · 21/${pad(pm)} → 20/${pad(m)}`};
}
// Which schedule month (kỳ) does an ISO date belong to?  Ngày ≥21 thuộc kỳ tháng SAU.
function schedMonthOf(iso){
  const[y,m,d]=iso.split('-').map(Number);
  if(d>=21){const nm=m===12?1:m+1, ny=m===12?y+1:y;return `${ny}-${pad(nm)}`;}
  return `${y}-${pad(m)}`;
}
function curSchedMonth(){return schedMonthOf(todayIso());}
function daysOfPeriod(ym){const p=periodFor(ym);const a=[];let d=new Date(p.from+'T00:00:00'),end=new Date(p.to+'T00:00:00');while(d<=end){a.push(isoOf(d));d.setDate(d.getDate()+1);}return a;}
/* Dời kỳ công 'YYYY-MM' đi delta kỳ (±). */
function schedYmShift(ym,delta){
  let a=String(ym).split('-').map(Number),y=a[0],m=a[1];
  m+=delta;while(m<1){m+=12;y--;}while(m>12){m-=12;y++;}
  return y+'-'+pad(m);
}
/* Khoảng ngày của cả một NĂM DƯƠNG (dùng để xoá/xuất theo năm). */
function yearRange(y){return {from:y+'-01-01',to:y+'-12-31'};}

/* =================== MONTH LIST =================== */
function monthsAvailable(){
  const set=new Set();
  const scan=obj=>{for(const e in obj)for(const iso in obj[e])set.add(schedMonthOf(iso));};
  scan(S.base);scan(S.over);
  if(S.meta.schedFrom)set.add(schedMonthOf(S.meta.schedFrom));
  set.add(curSchedMonth());
  return [...set].sort();
}
function fillMonthSelects(){
  const ms=monthsAvailable();
  const opt=m=>`<option value="${m}">${periodFor(m).slim}</option>`;
  const nowM=curSchedMonth();
  const setSel=id=>{const el=$(id);if(!el)return;const cur=el.value;el.innerHTML=ms.map(opt).join('');el.value=ms.includes(cur)?cur:(ms.includes(nowM)?nowM:ms[ms.length-1]||nowM);};
  setSel('calMonth');setSel('expMonth');setSel('stMonth');
}
function shiftCalMonth(d){
  const sel=$('calMonth');const i=sel.selectedIndex+d;
  if(i>=0&&i<sel.options.length){sel.selectedIndex=i;renderCal();}
}

/* ============================================================
   SANG KỲ MỚI THÌ TỰ NHẢY SANG KỲ MỚI
   ------------------------------------------------------------
   VẤN ĐỀ

   Kỳ công cắt ở ngày 21. App mở suốt (máy tính phòng điều độ, điện thoại
   để nền cả tuần) nên đến sáng 21 vẫn đang hiển thị kỳ CŨ: ô chọn kỳ giữ
   nguyên giá trị người dùng thấy hôm qua, các màn Báo cáo / Tổng hợp duyệt
   / Thống kê cá nhân thì nhớ kỳ trong biến (repYm, asYm, myStatYm…) và
   không ai xoá. Người dùng nhìn vào tưởng lịch kỳ mới chưa có.

   fillMonthSelects() không cứu được: nó CỐ Ý giữ lựa chọn đang có
   (`ms.includes(cur)?cur:…`) — phải thế, không thì đang xem kỳ tháng 5 mà
   dữ liệu đồng bộ về là bị đá ngược về kỳ hiện tại giữa chừng.

   CÁCH LÀM

   Nhớ kỳ hiện tại lúc khởi động. Cứ mỗi phút so lại: chỉ khi MỐC KỲ THẬT SỰ
   ĐỔI (qua ngày 21) mới xoá các biến nhớ kỳ và kéo mọi ô chọn về kỳ mới.
   Nghĩa là trong cùng một kỳ, người dùng vẫn tự do lật về kỳ cũ để tra cứu
   mà không bị giật lại — chỉ đúng thời khắc sang kỳ mới app mới can thiệp,
   và đó chính là lúc người ta muốn nó can thiệp.
   ============================================================ */
let _perWatch=curSchedMonth();
const PER_TICK_MS=60*1000;
let _perTick=null;
/* Kéo mọi chỗ đang nhớ kỳ về kỳ `ym`. Tách riêng để test gọi thẳng được. */
function perJumpTo(ym){
  /* Ô chọn kỳ trên các tab — ép giá trị TRƯỚC khi dựng lại danh sách, vì
     fillMonthSelects() sẽ giữ lại đúng giá trị đang có. */
  ['calMonth','expMonth','stMonth'].forEach(id=>{const el=$(id);if(el)el.value=ym;});
  /* Biến nhớ kỳ của từng màn. Đặt về '' để chúng tự rơi về curSchedMonth()
     ở lần vẽ kế tiếp — an toàn hơn gán cứng, vì mỗi màn có quy tắc riêng. */
  if(typeof repYm    !== 'undefined') repYm='';
  if(typeof esYm     !== 'undefined') esYm='';
  if(typeof asYm     !== 'undefined') asYm='';
  if(typeof myStatYm !== 'undefined') myStatYm='';
  if(typeof evYm     !== 'undefined') evYm='';
  if(typeof trYm     !== 'undefined') trYm='';
  /* Lịch cá nhân neo theo NGÀY chứ không theo kỳ → kéo về hôm nay. */
  if(typeof pvAnchor !== 'undefined') pvAnchor=null;
  if(typeof calWkMon !== 'undefined') calWkMon='';
  /* ★ v9.6 — sang kỳ mới là lúc gỡ người đã khai nghỉ việc khỏi danh sách
     (js/28-stdshift.js). Phải chạy TRƯỚC khi vẽ lại, không thì kỳ mới vẫn
     hiện tên họ cho tới lần tải trang sau. */
  if(typeof stdLeaverSweep==='function')stdLeaverSweep();
  if(typeof fillMonthSelects==='function')fillMonthSelects();
  if(typeof renderAll==='function')renderAll();
  else if(typeof renderCal==='function')renderCal();
  if(typeof renderMe==='function'&&typeof noSelf!=='undefined'&&!noSelf)renderMe(true);
  if(typeof toast==='function')
    toast('📅 '+t('Đã sang')+' '+periodFor(ym).short+' — '+t('lịch hiển thị đã chuyển sang kỳ mới'));
}
function perCheckRollover(){
  const now=curSchedMonth();
  if(now===_perWatch)return false;
  _perWatch=now;
  perJumpTo(now);
  return true;
}
function perStartWatch(){
  if(_perTick)clearInterval(_perTick);
  _perWatch=curSchedMonth();
  _perTick=setInterval(perCheckRollover,PER_TICK_MS);
  /* Máy tính ngủ rồi mở lại có thể nhảy qua cả ngày mà không tick nào chạy —
     nên soi thêm lúc tab được nhìn lại. */
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)perCheckRollover();
  });
}
/* =================== SHIFT GENERATOR =================== */
/* ============================================================
   ĐỌC CHUỖI MẪU CA   ★ v9.6 — nay chỉ phục vụ CA THỰC TẾ
   ------------------------------------------------------------
   Ba hàm dưới đây từng là ruột của kiểu ca 'custom' (mỗi người tự khai một
   chuỗi ca cho CA CHUẨN). Kiểu ca ấy đã bỏ: ca chuẩn nay chỉ có bốn kiểu cố
   định, khai theo NHÓM — xem js/28-stdshift.js.

   Chúng vẫn sống vì hộp "Áp pattern" ở CA THỰC TẾ dùng lại y nguyên
   (js/27-pattern.js): người dùng gõ "D D D N N N R R" để cho một người
   cover chỗ trống trong vài tuần.

   Viết sao cũng nhận: "OODDNNRR" · "O-O-D-D-N-N-R-R" · "O,O,D,D,N,N,R,R"
   · "o o d d n n r r". Mã dài (AL8, OTD…) phải có dấu ngăn, vì dính liền
   thì không cách nào biết "ALO" là "AL8"? hay "A"+"L"+"O".
   ============================================================ */
/* Cắt chuỗi mẫu ca thành mảng mã. Trả [] nếu không đọc được mã nào. */
function parseShiftPattern(str){
  const s=String(str||'').trim();
  if(!s)return [];
  /* Có dấu ngăn (khoảng trắng, phẩy, gạch, gạch đứng) → cắt theo dấu ngăn.
     Đây là cách khai duy nhất dùng được cho mã nhiều ký tự. */
  if(/[\s,\-|/]/.test(s)){
    return s.split(/[\s,\-|/]+/).map(x=>x.trim().toUpperCase()).filter(Boolean);
  }
  /* Dính liền → chỉ nhận mã MỘT ký tự (O D N R và mã tự khai 1 ký tự khác).
     Ký tự lạ bị bỏ qua chứ không làm hỏng cả mẫu. */
  const one=new Set((typeof allCodes==='function'?allCodes():DEFAULT_CODES)
                      .map(x=>x.c).filter(c=>c.length===1));
  return s.toUpperCase().split('').filter(ch=>one.has(ch));
}
/* Mẫu ca hợp lệ chưa? (dùng cho ô khai trong danh sách nhân sự) */
function shiftPatternOk(str){
  const a=parseShiftPattern(str);
  if(!a.length)return false;
  const known=new Set((typeof allCodes==='function'?allCodes():DEFAULT_CODES).map(x=>x.c));
  return a.every(c=>known.has(c));
}
/* Viết lại cho gọn mắt: "O·O·D·D·N·N·R·R" */
function shiftPatternLabel(str){
  const a=parseShiftPattern(str);
  return a.length?a.join('·'):'';
}
/* ============================================================
   BỘ SINH LỊCH CHUẨN   ★ v9.6 — bốn kiểu ca, không hơn
   ------------------------------------------------------------
   Bản trước có sáu nhánh (type1 · type2 · custom · admin · office6 · none)
   và còn cho khai Mốc 2 để tự suy chu kỳ. Bỏ bớt: chu kỳ nay CỐ ĐỊNH 8 hoặc
   6 ngày, Mốc 2 và mẫu ca tự khai không còn.

       ODNR   O O D D N N R R   chu kỳ 8 ngày, neo từ Mốc
       DNR    D D N N R R       chu kỳ 6 ngày, neo từ Mốc
       Office hành chính        T2→T6, nghỉ T7 + CN
       Office sản xuất          T2→T7, chỉ nghỉ CN

   Linh hoạt (đổi ca vài ngày, cover chỗ trống, chu kỳ lạ) KHÔNG khai ở đây
   nữa — khai bằng pattern ở CA THỰC TẾ, xem js/27-pattern.js. Ca chuẩn chỉ
   còn là cái mốc để so, nên nó phải đơn giản và đoán được.
   ============================================================ */
const SHIFT_CYCLE={type1:['O','O','D','D','N','N','R','R'],
                   type2:['D','D','N','N','R','R']};
function genForEmp(e,days){
  const out={};
  // Người mới vào giữa kỳ: chỉ xếp lịch từ NGÀY VÀO LÀM trở đi,
  // những ngày trước đó để trống (chưa thuộc biên chế).
  if(e.joinAt)days=days.filter(iso=>iso>=e.joinAt);
  /* Người NGHỈ VIỆC: không sinh lịch quá ngày làm việc cuối cùng. Đối xứng
     với joinAt ở trên. Họ vẫn nằm trong S.employees để bảng công các kỳ
     trước tra được — xem stdLeaverSweep() ở js/28-stdshift.js. */
  if(e.leftAt)days=days.filter(iso=>iso<=e.leftAt);
  if(!days.length)return out;

  if(e.shiftType==='none')return out;               // thư ký / cấp trên — không xếp lịch
  // Office hành chính — T2→T6 (nghỉ T7 + CN)
  if(e.empType==='admin'||e.shiftType==='admin'){
    days.forEach(iso=>{const dw=new Date(iso+'T00:00:00').getDay();out[iso]=(dw===0||dw===6)?'R':'O';});
    return out;
  }
  // Office sản xuất — T2→T7 (chỉ nghỉ Chủ nhật)
  if(e.shiftType==='office6'){
    days.forEach(iso=>{const dw=new Date(iso+'T00:00:00').getDay();out[iso]=(dw===0)?'R':'O';});
    return out;
  }
  /* ODNR / DNR — lặp chu kỳ cố định kể từ MỐC. Không có mốc thì KHÔNG sinh
     ô nào: rơi về ngày đầu khoảng là cách chắc chắn nhất để cả nhóm nhận
     nhầm lịch mà không ai biết vì sao. */
  const slots=SHIFT_CYCLE[e.shiftType==='type2'?'type2':'type1'];
  /* ★ v9.6.1 — mốc CHỈ lấy từ e.a1 (khai báo của nhóm). Bản cũ rơi về
     e.joinAt: người chưa có mốc nhóm mà có ngày vào làm sẽ chạy chu kỳ neo
     theo ngày vào làm của riêng mình — lệch pha với cả nhóm mà nhìn bảng
     không thấy gì bất thường. Thiếu mốc thì KHÔNG sinh ô nào, và màn Ca
     chuẩn kể tên người ấy ra (stdWhyBlank → 'noanchor'). */
  const anchor=e.a1||'';
  if(!anchor)return out;
  const a0=dayNum(anchor),n=slots.length;
  days.forEach(iso=>{
    out[iso]=slots[(((dayNum(iso)-a0)%n)+n)%n];
  });
  return out;
}
