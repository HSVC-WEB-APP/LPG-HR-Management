/* ============================================================
   CA CHUẨN KHAI THEO NHÓM   ★ v9.6
   LPGT Cavern — Quản lý Công Ca
   ------------------------------------------------------------
   VIỆC THẬT

   Tổ có bốn nhóm A · B · C · D và một khối Office. Mỗi nhóm chạy MỘT kiểu
   ca, bắt đầu từ MỘT ngày mốc. Người trong nhóm chạy y hệt nhau — đó là
   toàn bộ ca chuẩn, không có gì hơn.

   Bản v9.4/v9.5 bắt khai ca chuẩn ở bốn chỗ cho cùng một việc: thanh "Tạo /
   điền lịch", băng "Cơ cấu tổ", thanh cụm cột, và bảng dải chặng mỗi người
   một dòng với Mốc 1 · Mốc 2 · Mẫu ca · Chặng. Thêm hai nhóm ảo DCS/Field
   và màn Tái cơ cấu ba bước nữa thì bảng lịch mọc ra cột "A→D" và vạch
   chuyển cơ cấu — nhìn vào không ai biết ai đang ở nhóm nào.

   CÁCH LÀM

   Ca chuẩn khai ở ĐÚNG MỘT CHỖ, theo NHÓM:

       Nhóm A   [ODNR — 8 ngày]   mốc 21/09/2026
                Dương Xuân Thạnh · Field Engineer
                Vũ Văn Nam       · DCS Boardman
                …

   Bốn kiểu ca, không hơn: ODNR (8 ngày), DNR (6 ngày), Office hành chính
   (T2–T6), Office sản xuất (T2–T7). Mỗi người chỉ còn khai VỊ TRÍ và ở
   NHÓM nào. Mốc 1 / Mốc 2 / Mẫu ca / dải chặng của từng người — bỏ hết.

   Linh hoạt (ai cover ca ai, ai đổi mấy ngày) nay nằm trọn ở CA THỰC TẾ:
   nút Áp pattern của js/27-pattern.js. Ca chuẩn chỉ còn là cái mốc để so.

   BẤM MỚI CHẠY

   "Tạo ca chuẩn cho kỳ này" ghi lịch cho ĐÚNG kỳ đang chọn — kỳ khác không
   bị đụng. Ngày đã đi làm ở kỳ trước không bao giờ bị tính lại vì phần mềm
   không tự chạy lần nào.
   ============================================================ */

/* Bốn nhóm ca + khối Office. Đây là toàn bộ danh sách nhóm của tổ — không
   còn "tuyến DCS / Field": DCS Boardman và Field Engineer là VỊ TRÍ, người
   giữ vị trí ấy vẫn nằm trong bốn nhóm như mọi người. */
const STD_SHIFT_TEAMS=['A','B','C','D'];
const STD_OFFICE='Office';

/* Kiểu ca khai được — đúng bốn thứ tổ đang dùng, cộng "không xếp lịch"
   cho thư ký / cấp trên. Bộ sinh lịch ở js/04-schedule.js đã hiểu cả năm
   mã này từ lâu; ở đây chỉ đặt lại tên cho đúng cách tổ gọi. */
const STD_TYPES=[
  {v:'type1',  ic:'🔁', l:'ODNR — 8 ngày',  sub:'O O D D N N R R', cyc:8},
  {v:'type2',  ic:'🔁', l:'DNR — 6 ngày',   sub:'D D N N R R',     cyc:6},
  {v:'admin',  ic:'🏢', l:'Office hành chính', sub:'T2→T6, nghỉ T7 + CN', cyc:0},
  {v:'office6',ic:'🏭', l:'Office sản xuất',   sub:'T2→T7, chỉ nghỉ CN',  cyc:0},
  {v:'none',   ic:'—',  l:'Không xếp lịch',    sub:'không nằm trong bảng ca', cyc:0}
];
function stdTypeInfo(v){return STD_TYPES.find(x=>x.v===v)||STD_TYPES[0];}
function stdTypeLabel(v){const x=stdTypeInfo(v);return t(x.l);}
/* Kiểu ca có chu kỳ (rải mốc so le được) hay không */
function stdHasCycle(v){return stdTypeInfo(v).cyc>0;}

/* =================== KHAI BÁO CỦA TỪNG NHÓM ===================
   S.settings.stdTeams = { A:{shiftType,a1}, …, Office:{shiftType,a1} }
   Một nhóm = một kiểu ca + một mốc. Người trong nhóm không khai gì thêm.
   =============================================================== */
function stdTeamsDecl(){
  S.settings=S.settings||{};
  const d=S.settings.stdTeams=S.settings.stdTeams||{};
  STD_SHIFT_TEAMS.forEach((tm,i)=>{
    if(!d[tm])d[tm]={shiftType:'type1',a1:''};
  });
  if(!d[STD_OFFICE])d[STD_OFFICE]={shiftType:'admin',a1:''};
  return d;
}
function stdDecl(tm){
  const d=stdTeamsDecl();
  if(!d[tm])d[tm]={shiftType:isOfficeTeam(tm)?'admin':'type1',a1:''};
  return d[tm];
}
/* ============================================================
   KHAI RIÊNG CỦA TỪNG NGƯỜI   ★ v9.8
   ------------------------------------------------------------
   Nhóm là MẶC ĐỊNH, không phải là luật. Thực tế vẫn có người chạy khác cả
   nhóm: kỹ sư mượn sang tuyến khác vài kỳ, người mới vào lệch pha một
   tuần, người ngồi khối Office nhưng trực sản xuất T2→T7. Bản v9.6 bắt cả
   nhóm y hệt nhau nên những ca ấy phải đi vá tay ở ca THỰC TẾ mỗi kỳ.

   Hai trường trên bản ghi NHÂN VIÊN — rỗng là theo nhóm:

       e.ownType  kiểu ca riêng   (rỗng = lấy của nhóm)
       e.ownA1    ngày mốc riêng  (rỗng = lấy của nhóm)

   Rỗng cả hai thì mọi thứ y hệt trước. Đổi khai báo NHÓM không đụng tới
   người đã khai riêng — đó là toàn bộ ý nghĩa của chữ "riêng". Chọn đúng
   thứ nhóm đang dùng thì phần mềm tự gỡ khai riêng đi, để không đẻ ra một
   bản sao lặng lẽ đứng yên khi nhóm đổi.
   ============================================================ */
function stdEff(e){
  const d=stdDecl((e&&e.team)||'');
  const ownType=(e&&e.ownType)||'';
  const ownA1=(e&&e.ownA1)||'';
  const shiftType=ownType||d.shiftType;
  /* Mốc chỉ có nghĩa với kiểu ca CÓ CHU KỲ — Office không có pha để neo. */
  const a1=stdHasCycle(shiftType)?(ownA1||d.a1||''):'';
  return {shiftType,a1,ownType,ownA1,
          own:!!(ownType||(ownA1&&stdHasCycle(shiftType))),
          ownTypeOn:!!ownType,
          ownA1On:!!(ownA1&&stdHasCycle(shiftType)&&ownA1!==(d.a1||''))};
}
/* Nhóm này có mấy người khai riêng — thẻ nhóm gắn chip đếm */
function stdOwnCount(tm){return stdMembers(tm).filter(e=>stdEff(e).own).length;}
/* Nhóm nào đang có trong dữ liệu — bốn nhóm + Office luôn hiện dù rỗng,
   tên lạ (dữ liệu cũ) hiện thêm phía sau, "chưa phân nhóm" hiện cuối cùng
   và chỉ khi thật sự có người. */
function stdAllTeams(){
  const out=STD_SHIFT_TEAMS.concat([STD_OFFICE]);
  const extra=[];let none=false;
  activeEmps().forEach(e=>{
    const tm=e.team||'';
    if(!tm){none=true;return;}
    if(out.indexOf(tm)<0&&extra.indexOf(tm)<0)extra.push(tm);
  });
  return out.concat(extra.sort(),none?['']:[]);
}
function stdMembers(tm){
  return activeEmps().filter(e=>(e.team||'')===tm);
}
/* Nhóm này thiếu vị trí nào VÀO MỘT NGÀY — chỉ xét bốn nhóm ca, Office không
   cần. Phải xét theo NGÀY chứ không theo danh sách hiện tại: người đã khai
   nghỉ việc vẫn nằm trong danh sách cho tới hết kỳ, nhưng từ hôm sau ngày
   nghỉ họ không còn trực nữa — đó chính là lúc chỗ trống xuất hiện. */
function stdTeamGaps(tm,iso){
  if(tm===''||isOfficeTeam(tm)||STD_SHIFT_TEAMS.indexOf(tm)<0)return [];
  const d=iso||todayIso();
  const mem=stdMembers(tm).filter(e=>inServiceOn(e,d));
  const miss=[];
  if(!mem.some(e=>posCode(e)==='boardman'))miss.push('boardman');
  if(!mem.some(e=>posCode(e)==='field_eng'))miss.push('field_eng');
  return miss;
}
/* Mọi nhóm đang thiếu vị trí — hộp Áp pattern (js/27-pattern.js) đọc hàm
   này để gắn chip cảnh báo lên đúng nhóm. Trả [{team,miss}]. */
function stdGapsAll(iso){
  return STD_SHIFT_TEAMS.map(tm=>({team:tm,miss:stdTeamGaps(tm,iso)}))
                        .filter(x=>x.miss.length);
}
/* Tên nhóm viết ra màn hình. Ghép chuỗi "nhóm"+tên ở nhiều chỗ thì bản
   tiếng Anh ra "teams DCS" — sai số ít số nhiều mà lại lộ ra khắp nơi. */
function stdTeamName(tm){
  if(!tm)return t('(chưa phân nhóm)');
  return isOfficeTeam(tm)?tm:(t('Nhóm')+' '+tm);
}
/* "3 người" / "1 người" — tiếng Anh phải là person / people */
function stdCountLabel(n){
  return n+' '+((n===1)?t('người (1)'):t('người'));
}
function stdPosShort(e){
  const p=posCode(e);
  return p==='boardman'?'DCS':p==='field_eng'?'FE':p==='operator'?'OP':'';
}

/* ============================================================
   VÌ SAO MỘT NGƯỜI KHÔNG CÓ LỊCH?   ★ v9.6.1
   ------------------------------------------------------------
   Trước bản này, người không xếp được chỉ hiện ra thành một DÒNG TRỐNG trên
   bảng ca — không tên, không lý do, không chỗ sửa. Người dùng nhìn vào chỉ
   biết "Nam bị lỗi".

   Nay mọi lý do đều có tên, hiện ngay trên dòng của người ấy và gom lại ở
   đầu màn. `bad:true` = phải sửa; `bad:false` = đúng như khai, không phải lỗi.
   ============================================================ */
const STD_WHY={
  nosched   :{bad:false, ic:'🚫', l:'Đặt KHÔNG xếp lịch'},
  outservice:{bad:false, ic:'🚪', l:'Ngoài biên chế trong kỳ này'},
  noteam    :{bad:true,  ic:'❓', l:'Chưa phân nhóm'},
  noanchor  :{bad:true,  ic:'📌', l:'Nhóm chưa có mốc'},
  badrange  :{bad:true,  ic:'⛔', l:'Ngày vào làm SAU ngày nghỉ việc'},
  /* ★ v9.7 — mã NV này còn bia mộ trong sổ chống-hồi-sinh: mọi ô lịch vừa
     ghi sẽ bị lệnh đồng bộ xoá lại ngay, không một lời báo nào. Đây là gốc
     của lỗi "bấm Tạo mà dòng vẫn trống". applyTombstones() nay tự gỡ bia mộ
     của người còn trong danh sách, nên lý do này gần như không còn xảy ra —
     giữ lại làm phép soi, và để nói đúng bệnh nếu nó tái phát. */
  tomb      :{bad:true,  ic:'🪦', l:'Mã NV còn bia mộ — lịch ghi xong bị xoá lại'},
  empty     :{bad:true,  ic:'⚠', l:'Không sinh được ô nào'}
};
/* Trả mã lý do, '' nếu người này xếp được bình thường. THỨ TỰ quan trọng:
   badrange phải xét TRƯỚC outservice — khai sai hai ngày cũng làm khoảng
   biên chế rỗng, nói "ngoài biên chế" là giấu mất nguyên nhân thật. */
function stdWhyBlank(e,days){
  if(!e)return '';
  if(e.noSched||e.shiftType==='none')return 'nosched';
  if(e.joinAt&&e.leftAt&&e.joinAt>e.leftAt)return 'badrange';
  if(typeof tombHas==='function'&&(tombHas('base',e.id)||tombHas('over',e.id)))return 'tomb';
  if(!e.team)return 'noteam';
  const f=stdEff(e);
  if(f.shiftType==='none')return 'nosched';   /* khai riêng "không xếp lịch" */
  if(stdHasCycle(f.shiftType)&&!f.a1)return 'noanchor';
  if(days&&days.length&&!inServiceRange(e,days[0],days[days.length-1]))return 'outservice';
  return '';
}
/* Những người CẦN SỬA trong kỳ đang xem — băng đầu màn kể tên họ ra */
function stdProblems(days){
  return activeEmps().map(e=>({e,why:stdWhyBlank(e,days)}))
    .filter(x=>x.why&&STD_WHY[x.why].bad);
}

/* =================== TẠO CA CHUẨN =================== */
/* Chép khai báo của nhóm về từng người rồi sinh lịch cho ĐÚNG kỳ đang
   chọn. Hai việc phải làm cùng nhau: 25 file còn lại của app đọc
   `e.shiftType` / `e.a1` chứ không đọc sổ nhóm, nên sổ nhóm phải được chép
   xuống người trước khi sinh lịch. */
function stdSyncEmp(e){
  if(!e)return false;
  const tm=e.team||'';
  if(!tm)return false;                              /* chưa phân nhóm → không đoán */
  let ch=false;
  const put=(f,v)=>{if(e[f]!==v){e[f]=v;ch=true;}};
  /* KHÔNG XẾP LỊCH là cờ của TỪNG NGƯỜI, không phải của nhóm. Thư ký và
     giám đốc ngồi chung khối Office với người trực hành chính; lấy kiểu ca
     của nhóm áp lên họ là đẩy sếp vào bảng ca. */
  if(e.noSched){
    put('shiftType','none');put('empType','shift');
    if(e.segs){delete e.segs;ch=true;}
    return ch;
  }
  /* ★ v9.8 — khai của NHÓM, đè bởi khai RIÊNG của người này nếu có. */
  const f=stdEff(e);
  if(!f.shiftType)return false;
  put('shiftType',f.shiftType);
  put('a1',f.a1||'');
  put('a2','');
  put('pattern','');
  put('empType',f.shiftType==='admin'?'admin':'shift');
  /* Dải chặng của v9.4 đã bỏ: ca chuẩn nay khai theo nhóm, giữ lại chặng
     thì hai nguồn đá nhau và hrGenForEmp() sẽ thắng bản khai nhóm. */
  if(e.segs){delete e.segs;ch=true;}
  return ch;
}
function stdSyncAll(){let n=0;activeEmps().forEach(e=>{if(stdSyncEmp(e))n++;});return n;}

/* Sinh lịch chuẩn cho một kỳ. Trả {cells,people,skipped}. */
function stdBuild(ym){
  if(!hrGuard())return null;
  if(!/^\d{4}-\d{2}$/.test(ym||'')){toast(t('Chưa chọn kỳ'));return null;}
  const days=daysOfPeriod(ym);
  if(!days.length)return null;
  /* ★ v9.7 — gỡ bia mộ lạc TRƯỚC khi ghi. Người còn trong danh sách mà mã
     NV còn bia mộ thì mọi ô vừa ghi sẽ bị applyTombstones() xoá lại lúc
     save() — đúng cái đã làm ra một dòng lịch trống câm. Xem js/02-storage.js. */
  if(typeof tombLiftLiving==='function')tombLiftLiving();
  stdSyncAll();
  let cells=0,people=0;const skipped=[];
  activeEmps().forEach(e=>{
    /* XOÁ SẠCH kỳ này TRƯỚC ĐÃ. Ca chuẩn của một kỳ phải BẰNG ĐÚNG khai báo
       hiện tại — không xoá thì người vừa đổi nhóm, vừa đặt "không xếp lịch"
       hay vừa khai nghỉ việc vẫn còn ô cũ nằm lại, và bảng ca nói một đằng
       khai báo một nẻo. Chỉ đụng S.base; lịch THỰC TẾ (S.over) là chuyện
       khác, giữ nguyên. */
    const m=S.base[e.id];
    if(m)days.forEach(iso=>{delete m[iso];});
    const why=stdWhyBlank(e,days);
    if(why){if(STD_WHY[why].bad)skipped.push({e,why});return;}
    const gen=genForEmp(e,days);
    if(!Object.keys(gen).length){skipped.push({e,why:'empty'});return;}
    S.base[e.id]=S.base[e.id]||{};
    for(const iso in gen){
      if(gen[iso]==='')delete S.base[e.id][iso];
      else{S.base[e.id][iso]=gen[iso];cells++;}
    }
    people++;
  });
  /* Ô của người ĐÃ NGHỈ VIỆC không được để lại trong kỳ vừa tạo */
  stdPurgeAfterLeft(days[0],days[days.length-1]);
  /* ★ v9.7 — GÁN TỪNG TRƯỜNG, đừng thay cả object.
     `S.meta` còn giữ `digestDay` — cái mốc "bản tin 08:00 hôm nay đã gom
     rồi" của js/21-notify.js. Thay nguyên object là xoá mốc ấy, và máy nào
     mở app tiếp theo sẽ gom lại bản tin của ngày hôm đó lần thứ hai: cả tổ
     nhận trùng tin Zalo, chỉ vì vừa có người bấm Tạo ca chuẩn. */
  S.meta=S.meta||{};
  S.meta.schedFrom=days[0];
  S.meta.schedTo=days[days.length-1];
  save();fillMonthSelects();
  return {cells,people,skipped,ym};
}
/* Nút bấm */
function stdDoBuild(){
  const ym=stdYm||curSchedMonth();
  const p=periodFor(ym);
  const had=activeEmps().some(e=>S.base[e.id]&&days1Has(S.base[e.id],p.from,p.to));
  if(had&&!confirm(t('Tạo lại ca chuẩn cho')+' '+p.label+'?\n'
    +t('Lịch CHUẨN của kỳ này sẽ được ghi đè theo khai báo nhóm hiện tại. Lịch THỰC TẾ (ô đã sửa tay, đơn đã duyệt) giữ nguyên.')))return;
  const r=stdBuild(ym);
  if(!r)return;
  renderStdShift();
  if(typeof renderBoth==='function')renderBoth();
  /* Kể TÊN người chưa xếp được, không chỉ đếm số. Một con số thì người dùng
     vẫn phải đi dò cả bảng xem ai trống. */
  const miss=r.skipped;
  toast(t('Đã tạo')+' '+r.cells+' '+t('ô ca chuẩn cho')+' '+r.people+' '+t('người')
      +' — '+p.label
      +(miss.length?(' · ⚠ '+t('chưa xếp được')+': '
          +miss.map(x=>(x.e.name||x.e.id)).join(', ')):''));
}
/* Có ô nào của người này rơi vào khoảng không */
function days1Has(map,from,to){
  for(const iso in map)if(iso>=from&&iso<=to)return true;
  return false;
}
/* Rải mốc so le 2 ngày: A = ngày gốc, B = +2, C = +4, D = +6.
   Chỉ đụng nhóm có chu kỳ — Office không có pha để rải. */
function stdStagger(baseIso){
  if(!hrGuard())return 0;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(baseIso||'')){toast(t('Chọn ngày gốc trước'));return 0;}
  const d=stdTeamsDecl();let n=0;
  STD_SHIFT_TEAMS.forEach((tm,i)=>{
    if(!stdHasCycle(d[tm].shiftType))return;
    d[tm].a1=addDaysIso(baseIso,i*2);n++;
  });
  stdSyncAll();save();renderStdShift();
  /* Người khai mốc riêng KHÔNG bị rải theo — nói ra, không thì tưởng nút hỏng. */
  const keep=activeEmps().filter(e=>stdEff(e).ownA1On).length;
  toast(t('Đã rải mốc cho')+' '+n+' '+t('nhóm, lệch nhau 2 ngày kể từ')+' '+fmtVNfull(baseIso)
      +(keep?(' · ⚙ '+keep+' '+t('người giữ mốc riêng')):''));
  return n;
}

/* =================== SỬA KHAI BÁO =================== */
function stdSetTeam(tm,f,v){
  if(!hrGuard())return;
  const d=stdDecl(tm);
  d[f]=v;
  if(f==='shiftType'&&!stdHasCycle(v))d.a1=d.a1||'';
  stdSyncAll();save();renderStdShift();
  if(typeof renderBoth==='function')renderBoth();
  const own=stdOwnCount(tm);
  if(own)toast('⚙ '+own+' '+t('người trong nhóm này khai riêng — họ KHÔNG đổi theo'));
}
/* ---- Khai riêng của một người  ★ v9.8 ---- */
function stdSetOwn(id,f,v){
  if(!hrGuard())return;
  const e=empById(id);if(!e)return;
  const val=String(v||'').trim();
  if(f==='ownA1'&&val&&!/^\d{4}-\d{2}-\d{2}$/.test(val)){renderStdShift();return;}
  const d=stdDecl(e.team||'');
  /* Chọn đúng thứ nhóm đang dùng = quay về theo nhóm. Giữ lại bản sao thì
     lần sau nhóm đổi mà người này đứng yên, không ai hiểu vì sao. */
  if(f==='ownType')e.ownType=(val===d.shiftType)?'':val;
  else e.ownA1=(val===(d.a1||''))?'':val;
  if(!e.ownType)delete e.ownType;
  if(!e.ownA1)delete e.ownA1;
  stdSyncEmp(e);save();renderStdShift();
  if(typeof renderBoth==='function')renderBoth();
  const nm=e.name||id;
  toast(stdEff(e).own
    ? '⚙ '+t('Khai riêng cho')+' '+nm+': '+stdTypeLabel(stdEff(e).shiftType)
      +(stdEff(e).a1?(' · '+t('mốc')+' '+fmtVNfull(stdEff(e).a1)):'')
      +' — '+t('bấm Tạo ca chuẩn để xếp lại lịch')
    : t('Đã bỏ khai riêng — theo nhóm trở lại')+': '+nm);
}
function stdClearOwn(id){
  if(!hrGuard())return;
  const e=empById(id);if(!e)return;
  if(!stdEff(e).own){renderStdShift();return;}
  delete e.ownType;delete e.ownA1;
  stdSyncEmp(e);save();renderStdShift();
  if(typeof renderBoth==='function')renderBoth();
  toast(t('Đã bỏ khai riêng — theo nhóm trở lại')+': '+(e.name||id)
      +' — '+t('bấm Tạo ca chuẩn để xếp lại lịch'));
}
function stdToggleOwn(id){
  if(stdOwnOpen[id])delete stdOwnOpen[id];else stdOwnOpen[id]=1;
  renderStdShift();
}
function stdMove(id,tm){
  if(!hrGuard())return;
  const e=empById(id);if(!e)return;
  e.team=tm||'';
  stdSyncEmp(e);save();renderStdShift();
  if(typeof renderBoth==='function')renderBoth();
}
function stdSetPos(id,v){
  if(!hrGuard())return;
  const e=empById(id);if(!e)return;
  e.pos=v||'';
  /* role cũ vẫn được vài màn đọc — giữ cho khớp vị trí vừa chọn */
  const p=posCode(e);
  e.role=(p==='field_eng'||p==='boardman')?'eng':(p==='operator'?'oper':'other');
  save();renderStdShift();
  if(typeof renderBoth==='function')renderBoth();
}
/* ============================================================
   VÒNG ĐỜI CỦA MỘT NGƯỜI: ngày vào làm · ngày làm việc cuối
   ------------------------------------------------------------
   Hai trường này CẮT LỊCH (js/04-schedule.js, genForEmp) nhưng bản v9.6 đầu
   tiên không cho nhìn thấy chúng ở đâu cả — một trường vô hình mà điều
   khiển kết quả. Đúng cái đã xảy ra: một người mang `joinAt` cũ sót lại NẰM
   SAU `leftAt`, thế là mọi ngày đều bị lọc ra và bảng ca hiện một dòng
   trống trơn không lời giải thích.
   ============================================================ */
function stdSetLife(id,f,v){
  if(!hrGuard())return;
  const e=empById(id);if(!e)return;
  const val=String(v||'').trim();
  if(val&&!/^\d{4}-\d{2}-\d{2}$/.test(val)){renderStdShift();return;}
  const join=(f==='joinAt')?val:(e.joinAt||'');
  const left=(f==='leftAt')?val:(e.leftAt||'');
  /* Chặn ngay tại chỗ nhập, không để nó đi tiếp rồi hoá thành một dòng trống.
     GỠ (chuỗi rỗng) thì luôn cho, kể cả khi cặp ngày đang mâu thuẫn — đó
     chính là cách thoát ra khỏi dữ liệu cũ đã sai. */
  if(val&&join&&left&&join>left){
    toast('⛔ '+t('Ngày vào làm')+' '+fmtVNfull(join)+' '+t('nằm SAU ngày làm việc cuối')
        +' '+fmtVNfull(left)+' — '+t('người này sẽ không có ngày nào đi làm'));
    renderStdShift();return;
  }
  e[f]=val;
  if(f==='leftAt'){
    if(val)stdPurgeAfterLeft();
    else if(e.active===false)e.active=true;
  }
  save();renderStdShift();
  if(typeof renderBoth==='function')renderBoth();
  toast(t(f==='joinAt'?'Đã đặt ngày vào làm':'Đã đặt ngày làm việc cuối')
      +': '+(val?fmtVNfull(val):t('(bỏ trống)'))+' — '+t('bấm Tạo ca chuẩn để xếp lại lịch'));
}
function stdToggleLife(id){if(stdLifeOpen[id])delete stdLifeOpen[id];else stdLifeOpen[id]=1;renderStdShift();}

/* Bật / tắt "không xếp lịch" cho một người (thư ký, giám đốc…). Họ vẫn có
   tài khoản, vẫn duyệt đơn, chỉ là không nằm trong bảng ca. */
function stdToggleSched(id){
  if(!hrGuard())return;
  const e=empById(id);if(!e)return;
  e.noSched=!e.noSched;
  if(!e.noSched&&e.shiftType==='none')e.shiftType='';
  stdSyncEmp(e);
  if(e.noSched){delete S.base[id];delete S.over[id];}
  save();renderStdShift();
  if(typeof renderBoth==='function')renderBoth();
  toast(e.noSched?t('Đã đặt KHÔNG xếp lịch cho')+' '+(e.name||id)
                 :t('Đã đưa trở lại bảng ca')+' — '+t('bấm Tạo ca chuẩn để xếp lịch'));
}
function stdSetName(id,v){
  if(!hrGuard())return;
  const e=empById(id);if(!e)return;
  e.name=String(v||'').trim();save();
}
/* Thêm một người trống vào nhóm — khai tên và mã ngay tại dòng */
function stdAddTo(tm){
  if(!hrGuard())return;
  const nid=newVc();
  if(typeof tombLiftEmp==='function')tombLiftEmp(nid);
  S.employees.push({id:nid,name:'',pos:'',role:'oper',team:tm||'',noSched:false,
    empType:'shift',shiftType:stdDecl(tm||'A').shiftType||'type1',
    a1:stdDecl(tm||'A').a1||'',a2:'',order:S.employees.length+1,active:true});
  save();renderStdShift();
  toast(t('Đã thêm một dòng vào')+' '+(tm?t('nhóm')+' '+tm:t('(chưa phân nhóm)')));
}
/* ============================================================
   ĐỔI NHÓM GIỮA HAI NGƯỜI
   ------------------------------------------------------------
   Chuyển từng người một thì có một khoảnh khắc hai người cùng nằm một nhóm
   và nhóm kia trống — nhìn vào tưởng khai sai, mà nếu bấm Tạo ca chuẩn
   đúng lúc ấy thì lịch ra sai thật. Hoán đổi là MỘT thao tác.
   ============================================================ */
function stdSwap(idA,idB){
  if(!hrGuard())return false;
  const a=empById(idA),b=empById(idB);
  if(!a||!b){toast(t('Chọn đủ hai người'));return false;}
  if(a.id===b.id){toast(t('Phải là hai người khác nhau'));return false;}
  if((a.team||'')===(b.team||'')){toast(t('Hai người đang cùng một nhóm — không có gì để đổi'));return false;}
  const ta=a.team||'',tb=b.team||'';
  a.team=tb;b.team=ta;
  stdSyncEmp(a);stdSyncEmp(b);
  save();renderStdShift();
  if(typeof renderBoth==='function')renderBoth();
  const nm=(e,tm)=>(e.name||e.id)+' ('+(tm||t('chưa phân nhóm'))+'→'+(e.team||t('chưa phân nhóm'))+')';
  toast('⇄ '+nm(a,ta)+'  ⇄  '+nm(b,tb));
  return true;
}
function stdDoSwap(){
  if(!stdSwapA||!stdSwapB){toast(t('Chọn đủ hai người'));return;}
  const ida=stdSwapA,idb=stdSwapB;
  if(!stdSwap(ida,idb))return;
  stdSwapA='';stdSwapB='';
  /* Đổi nhóm xong mà lịch kỳ này đã tạo thì nó đang SAI — hỏi luôn, đừng
     để người dùng phát hiện ra sau ba ngày. */
  const p=periodFor(stdCurYm());
  const had=activeEmps().some(e=>S.base[e.id]&&days1Has(S.base[e.id],p.from,p.to));
  if(had&&confirm(t('Đã đổi nhóm. Lịch chuẩn của')+' '+p.label+' '+
      t('đang xếp theo nhóm cũ — tạo lại ngay?'))){
    const r=stdBuild(stdCurYm());
    if(r)toast(t('Đã tạo lại')+' '+r.cells+' '+t('ô ca chuẩn'));
  }
  renderStdShift();
}
function stdSetSwap(w,v){
  const id=stdPickResolve(v);
  if(v&&!id)toast(t('Không tìm ra ai khớp — chọn từ danh sách gợi ý'));
  if(w==='a')stdSwapA=id;else stdSwapB=id;
  renderStdShift();
}

/* ============================================================
   XOÁ HẲN MỘT DÒNG   ★ v9.7 — xoá được cả người ĐÃ CÓ LỊCH
   ------------------------------------------------------------
   Bản v9.6 chặn cứng: có lịch hoặc có đơn thì không cho xoá, bắt dùng
   "Khai nghỉ việc". Lý do đưa ra khi ấy — giữ bảng công kỳ trước — chỉ
   đúng với người ĐI LÀM THẬT rồi nghỉ. Nó chặn nhầm trường hợp phổ biến
   hơn: một dòng KHAI SAI đã trót được tạo lịch (nhập nhầm mã, một người
   hai dòng, dòng thử nghiệm), nay muốn xoá đi khai lại cho sạch. Với dòng
   ấy, khai nghỉ việc chỉ để lại rác mang tên một người không có thật.

   Nay xoá được, nhưng phải NÓI TRƯỚC MẤT GÌ và ĐỂ LẠI ĐƯỜNG LÙI: lời hỏi
   đọc ra từng con số (bao nhiêu ô lịch, mấy đơn, mấy đơn đã duyệt), và
   trước khi xoá, trình duyệt tự tải về một file .json chứa trọn bản ghi.
   Người thật sự nghỉ việc thì vẫn nên dùng nút 🚪 — lời hỏi có nhắc.

   Xem empFootprint / empBackup / empPurge ở js/05-roster.js.
   ============================================================ */
function stdRemove(id){
  if(!hrGuard())return;
  const e=empById(id);if(!e)return;
  const nm=e.name||id;
  const f=(typeof empFootprint==='function')?empFootprint(id)
          :{base:0,over:0,reqs:0,reqsOk:0,acc:false,notifs:0,trains:0};
  const heavy=f.base||f.over||f.reqs||f.trains;

  /* Dòng trắng tinh (vừa bấm "Thêm người" rồi đổi ý) — hỏi một câu là đủ,
     không có gì để mất và không cần file sao lưu. */
  if(!heavy){
    if(!confirm(t('Xoá hẳn dòng')+' '+nm+'?'))return;
    if(typeof empPurge==='function')empPurge(id);
    else{S.employees=S.employees.filter(x=>x.id!==id);
         delete S.base[id];delete S.over[id];save();}
    renderSetup();   // vẽ lại CẢ màn: nửa trên (ca chuẩn) + bảng Tài khoản ở nửa dưới
    if(typeof renderBoth==='function')renderBoth();
    toast(t('Đã xoá')+' '+nm);
    return;
  }

  /* Có dấu vết → kể ra bằng số, và nhắc lối đi đúng cho người nghỉ việc. */
  const bits=[];
  if(f.base)  bits.push(f.base+' '+t('ô ca chuẩn'));
  if(f.over)  bits.push(f.over+' '+t('ô ca thực tế'));
  if(f.reqs)  bits.push(f.reqs+' '+t('đơn')+(f.reqsOk?(' ('+f.reqsOk+' '+t('đã duyệt')+')'):''));
  if(f.trains)bits.push(f.trains+' '+t('buổi đào tạo'));
  if(f.acc)   bits.push(t('tài khoản đăng nhập'));
  if(f.notifs)bits.push(f.notifs+' '+t('thông báo'));
  if(!confirm(t('XOÁ HẲN')+' '+nm+' ('+id+')?\n\n'
    +t('Sẽ mất:')+' '+bits.join(' · ')+'\n\n'
    +t('Người NGHỈ VIỆC thật thì nên dùng nút 🚪 Khai nghỉ việc — bảng công các kỳ trước vẫn tra được. Chỉ xoá hẳn khi đây là dòng khai sai, cần khai lại từ đầu.')+'\n\n'
    +t('Trước khi xoá, máy sẽ tự tải về một file .json sao lưu người này.')))return;

  const fn=(typeof empBackup==='function')?empBackup(id):'';
  /* Xác nhận lần hai đọc lại đúng tên — lời hỏi thứ nhất còn có thể bấm
     nhầm, lời hỏi thứ hai thì phải đọc. */
  if(!confirm(t('Xác nhận lần cuối: xoá hẳn')+' '+nm+'.\n'
    +(fn?(t('Đã tải file sao lưu:')+' '+fn):t('⚠ KHÔNG tải được file sao lưu — xoá là mất hẳn.'))+'\n\n'
    +t('Bấm OK để xoá.')))return;

  if(typeof empPurge==='function')empPurge(id);
  else{S.employees=S.employees.filter(x=>x.id!==id);
       delete S.base[id];delete S.over[id];
       if(S.accounts)delete S.accounts[id];save();}
  renderSetup();   // vẽ lại CẢ màn: nửa trên (ca chuẩn) + bảng Tài khoản ở nửa dưới
  if(typeof renderBoth==='function')renderBoth();
  toast('🗑️ '+t('Đã xoá hẳn')+' '+nm+' — '+bits.join(' · ')
      +(fn?(' · '+t('sao lưu')+' '+fn):''));
}

/* ============================================================
   NGHỈ VIỆC   ★ v9.6
   ------------------------------------------------------------
   Khai một ngày làm việc CUỐI CÙNG. Từ hôm sau lịch của người ấy TRẮNG —
   cả ca chuẩn lẫn ca thực tế — nên bảng lịch, đếm quân số và bảng cơm
   không còn tính họ nữa.

   Sang KỲ SAU thì phần mềm tự gỡ tên khỏi mọi danh sách và chặn đăng nhập
   (`active=false`). KHÔNG xoá bản ghi: bảng công, đơn và báo cáo của các kỳ
   trước vẫn phải tra được — đó là giấy tờ tính lương.

   Vì sao đợi sang kỳ mới gỡ chứ không gỡ ngay: người nghỉ ngày 05 vẫn phải
   nằm trong bảng công của kỳ đang chạy, và vẫn có thể còn đơn chờ duyệt.
   ============================================================ */
/* Xoá ô lịch nằm sau ngày làm việc cuối cùng. Có thể giới hạn trong một
   khoảng (lúc tạo ca chuẩn) hoặc quét tất cả (lúc boot). */
function stdPurgeAfterLeft(fromIso,toIso){
  let n=0;
  S.employees.forEach(e=>{
    if(!e.leftAt)return;
    [S.base[e.id],S.over[e.id]].forEach(map=>{
      if(!map)return;
      Object.keys(map).forEach(iso=>{
        if(iso<=e.leftAt)return;
        if(fromIso&&iso<fromIso)return;
        if(toIso&&iso>toIso)return;
        delete map[iso];n++;
      });
    });
  });
  return n;
}
/* Khai nghỉ việc cho một người */
function stdLeave(id,iso){
  if(!hrGuard())return null;
  const e=empById(id);
  if(!e){toast(t('Không tìm thấy nhân viên'));return null;}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso||'')){toast(t('Chọn ngày làm việc cuối cùng'));return null;}
  if(e.joinAt&&iso<e.joinAt){
    toast('⛔ '+t('Ngày làm việc cuối')+' '+fmtVNfull(iso)+' '+t('nằm TRƯỚC ngày vào làm')
        +' '+fmtVNfull(e.joinAt));
    return null;
  }
  e.leftAt=iso;
  const n=stdPurgeAfterLeft();
  /* Đơn CHỜ DUYỆT rơi sau ngày nghỉ thì không còn nghĩa gì — báo để người
     duyệt biết mà đóng lại, nhưng KHÔNG tự xoá: xoá đơn của người khác sau
     lưng họ là việc không được làm âm thầm. */
  const dead=Object.values(S.requests||{}).filter(r=>r&&r.empId===id
    &&r.status==='pending'&&String(r.from||r.iso||'')>iso).length;
  save();
  if(typeof renderBoth==='function')renderBoth();
  if(typeof renderStdShift==='function')renderStdShift();
  return {n,dead,name:e.name||id,iso};
}
/* Huỷ khai nghỉ việc (khai nhầm ngày / người ấy ở lại) */
function stdUnleave(id){
  if(!hrGuard())return;
  const e=empById(id);if(!e)return;
  e.leftAt='';
  if(e.active===false)e.active=true;
  save();
  if(typeof renderBoth==='function')renderBoth();
  renderStdShift();
  toast(t('Đã bỏ khai nghỉ việc cho')+' '+(e.name||id)+' — '+t('bấm Tạo ca chuẩn để xếp lịch lại'));
}
/* SANG KỲ MỚI THÌ GỠ KHỎI DANH SÁCH.
   Chạy lúc boot và mỗi lần app tự nhảy sang kỳ mới (js/04-schedule.js).
   Chỉ đụng người có leftAt thuộc kỳ ĐÃ QUA. */
function stdLeaverSweep(){
  const now=curSchedMonth();
  let n=0;
  S.employees.forEach(e=>{
    if(!e.leftAt||e.active===false)return;
    if(schedMonthOf(e.leftAt)>=now)return;           /* còn trong kỳ đang chạy */
    e.active=false;n++;
  });
  if(n){stdPurgeAfterLeft();save();}
  return n;
}
/* Người đã nghỉ nhưng CHƯA tới kỳ gỡ — để băng nhắc hiện ra */
function stdPendingLeavers(){
  const now=curSchedMonth();
  return S.employees.filter(e=>e.leftAt&&e.active!==false&&schedMonthOf(e.leftAt)>=now);
}

/* ============================================================
   CHUYỂN ĐỔI DỮ LIỆU CŨ — chạy một lần lúc boot
   ------------------------------------------------------------
   · dải chặng v9.4 (`e.segs`) → chép chặng đang hiệu lực về trường phẳng
   · hai nhóm ảo "DCS" / "Field" → gỡ tên nhóm, người ấy về "chưa phân nhóm"
   · sổ của màn Tái cơ cấu (`S.reorgs`, `e.pl2`, `S.settings.planSegs`) → bỏ
   · sổ khai báo nhóm chưa có → suy từ dữ liệu người đang có
   ============================================================ */
function stdIsOldLine(tm){
  const s=noAccent(String(tm||'')).replace(/\s+/g,'').toLowerCase();
  return s==='dcs'||s==='field';
}
function stdMigrateV96(){
  let n=0;
  S.employees.forEach(e=>{
    /* 1) dải chặng → trường phẳng (lấy chặng phủ HÔM NAY, không thì chặng
          làm việc đầu tiên) */
    if(e.segs&&e.segs.length){
      const today=todayIso();
      const list=e.segs.slice().sort((a,b)=>(a.from||'')<(b.from||'')?-1:1);
      const s=list.filter(x=>(!x.from||x.from<=today)&&(!x.to||x.to>=today)).pop()
            ||list.filter(x=>x.kind!=='off')[0]||list[0];
      if(s){
        if(s.team)e.team=s.team;
        if(s.pos)e.pos=s.pos;
        if(s.shiftType&&s.shiftType!=='custom')e.shiftType=s.shiftType;
        if(s.a1)e.a1=s.a1;
      }
      delete e.segs;n++;
    }
    /* 2) mẫu ca tự khai không còn là kiểu ca chuẩn — về ODNR, linh hoạt
          chuyển sang khai ở ca thực tế (js/27-pattern.js) */
    if(e.shiftType==='custom'){e.shiftType='type1';n++;}
    if(e.pattern){delete e.pattern;n++;}
    /* 3) "không xếp lịch" là cờ của người, không phải kiểu ca của nhóm */
    if(e.shiftType==='none'&&!e.noSched){e.noSched=true;n++;}
    if(e.pl2){delete e.pl2;n++;}
  });
  /* 4) HAI NHÓM ẢO "DCS" / "Field" — bỏ hẳn.
        KHÔNG bỏ lửng người trong đó: kỹ sư được rót về nhóm A/B/C/D nào
        đang THIẾU ĐÚNG VỊ TRÍ của họ — đó là chỗ họ vốn thuộc về trước khi
        tổ gom thành hai tuyến, và cũng là cách bảng ca của bộ phận đang ghi
        (mỗi nhóm 1 Field Engineer + 1 DCS Boardman).
        Operator thì GIỮ NGUYÊN nhóm cũ; ai ở nhóm ảo mà không phải kỹ sư
        (hiếm) mới rơi về "chưa phân nhóm" để người dùng tự xếp. */
  n+=stdRehomeOldLines();
  if(S.settings){
    if(S.settings.planSegs){delete S.settings.planSegs;n++;}
    if(S.settings.structLog){delete S.settings.structLog;n++;}
  }
  if(S.reorgs&&Object.keys(S.reorgs).length){S.reorgs={};n++;}
  if(stdSeedDecl())n++;
  /* KHÔNG tự save() ở đây: hàm này còn được gọi ngay sau khi dữ liệu Firebase
     về (js/02-storage.js), lúc ấy mốc đồng bộ phải được đặt TRƯỚC rồi mới
     ghi, không thì bản đã dọn không bao giờ lên tới máy chủ. */
  return n;
}
/* Rót người ở nhóm ảo về đúng nhóm thiếu vị trí. Trả số người đã đụng. */
function stdRehomeOldLines(){
  const stray=S.employees.filter(e=>e.active!==false&&stdIsOldLine(e.team));
  if(!stray.length)return 0;
  const strayIds={};stray.forEach(e=>{strayIds[e.id]=1;});
  /* Vị trí nào đã có người ở nhóm nào — chỉ đếm người KHÔNG phải diện đang
     xếp lại, không thì hai người cùng vị trí tự chặn nhau. */
  const taken={};
  STD_SHIFT_TEAMS.forEach(tm=>{taken[tm]={};});
  S.employees.forEach(e=>{
    if(e.active===false||strayIds[e.id])return;
    const tm=e.team||'';
    if(!taken[tm])return;
    taken[tm][posCode(e)]=1;
  });
  let n=0;
  stray.forEach(e=>{
    const p=posCode(e);
    let to='';
    if(p==='boardman'||p==='field_eng')
      to=STD_SHIFT_TEAMS.find(tm=>!taken[tm][p])||'';
    if(to)taken[to][p]=1;
    e.team=to;n++;
  });
  return n;
}

/* Suy khai báo nhóm từ dữ liệu người đang có — chỉ khi sổ còn trống, để
   không đè lên bản khai người dùng đã sửa tay. */
function stdSeedDecl(){
  S.settings=S.settings||{};
  if(S.settings.stdTeams)return false;
  const d={};
  stdAllTeams().filter(tm=>tm!=='').forEach(tm=>{
    const mem=stdMembers(tm).filter(e=>e.shiftType&&e.shiftType!=='none'&&!e.noSched);
    const cnt={},a1s=[];
    mem.forEach(e=>{cnt[e.shiftType]=(cnt[e.shiftType]||0)+1;if(e.a1)a1s.push(e.a1);});
    let best=isOfficeTeam(tm)?'admin':'type1',bn=0;
    for(const k in cnt)if(cnt[k]>bn){bn=cnt[k];best=k;}
    a1s.sort();
    d[tm]={shiftType:best,a1:a1s.length?a1s[Math.floor(a1s.length/2)]:''};
  });
  S.settings.stdTeams=d;
  stdTeamsDecl();
  return true;
}

/* =================== TRẠNG THÁI MÀN =================== */
let stdYm='';                 // kỳ đang chọn
let stdBaseDay='';            // ngày gốc của nút rải mốc
let stdShut={};               // nhóm nào đang thu lại
let stdSwapA='',stdSwapB='';  // hai người đang chọn để đổi nhóm
let stdLifeOpen={};           // dòng nào đang mở dải ngày vào làm / nghỉ việc
let stdOwnOpen={};            // ★ v9.8 — dòng nào đang mở khai riêng kiểu ca / mốc

function stdCurYm(){return stdYm||curSchedMonth();}
function stdSetYm(v){stdYm=v;renderStdShift();}
function stdShiftYm(d){
  const ms=stdYmList(),i=ms.indexOf(stdCurYm())+d;
  if(i>=0&&i<ms.length)stdSetYm(ms[i]);
}
function stdYmList(){
  const set=new Set(typeof monthsAvailable==='function'?monthsAvailable():[]);
  const cur=curSchedMonth();
  for(let k=-6;k<=6;k++)set.add(schedYmShift(cur,k));
  set.add(stdCurYm());
  return [...set].sort();
}
function stdToggleTeam(tm){if(stdShut[tm])delete stdShut[tm];else stdShut[tm]=1;renderStdShift();}

/* =================== DẢI CA XEM TRƯỚC =================== */
/* Vẽ mã ca DỰ KIẾN của nhóm theo khai báo hiện tại — không phải lịch đã
   lưu. Sửa kiểu ca hay mốc là dải đổi ngay, khỏi phải bấm Tạo rồi sang tab
   Lịch mới biết khai đúng chưa. */
function stdStripHtml(tm,days){
  const d=stdDecl(tm);
  if(d.shiftType==='none')return `<div class="std-strip none">${t('Không xếp lịch')}</div>`;
  if(stdHasCycle(d.shiftType)&&!d.a1)
    return `<div class="std-strip none">${t('Chưa có mốc — bấm vào ô Mốc bên trên')}</div>`;
  const fake={id:'_std',shiftType:d.shiftType,empType:d.shiftType==='admin'?'admin':'shift',
              a1:d.a1||days[0],a2:'',pattern:''};
  const gen=genForEmp(fake,days);
  return `<div class="std-strip">${days.map(iso=>{
    const c=gen[iso]||'';
    return `<i class="c-${esc(c||'x')}" title="${esc(fmtVNfull(iso)+' · '+(c||'—'))}">${esc(c)}</i>`;
  }).join('')}</div>`;
}

/* Dải ca DỰ KIẾN của MỘT NGƯỜI ★ v9.8 — vẽ theo khai HIỆU LỰC (riêng nếu
   có, không thì của nhóm) và cắt theo ngày vào làm / ngày làm việc cuối,
   để nhìn thấy ngay khai riêng ra lịch gì mà khỏi phải bấm Tạo. */
function stdEmpStripHtml(e,days){
  if(e.noSched)return `<div class="std-strip none">${t('Không xếp lịch')}</div>`;
  const f=stdEff(e);
  if(f.shiftType==='none')return `<div class="std-strip none">${t('Không xếp lịch')}</div>`;
  if(stdHasCycle(f.shiftType)&&!f.a1)
    return `<div class="std-strip none">${t('Chưa có mốc — điền ô Mốc riêng, hoặc đặt mốc cho cả nhóm')}</div>`;
  const fake={id:'_own',shiftType:f.shiftType,
              empType:f.shiftType==='admin'?'admin':'shift',
              a1:f.a1||days[0],a2:'',pattern:'',
              joinAt:e.joinAt||'',leftAt:e.leftAt||''};
  const gen=genForEmp(fake,days);
  return `<div class="std-strip">${days.map(iso=>{
    const c=gen[iso]||'';
    return `<i class="c-${esc(c||'x')}" title="${esc(fmtVNfull(iso)+' · '+(c||'—'))}">${esc(c)}</i>`;
  }).join('')}</div>`;
}

/* =================== Ô CHỌN NGƯỜI CÓ TÌM THEO TÊN ===================
   Hai chục dòng trong một <select> thì phải cuộn và đọc từng cái. Dùng
   <input list> + <datalist>: gõ "nam" là trình duyệt lọc ngay, gõ mã NV
   cũng ra, mà vẫn bấm mũi tên xem cả danh sách được.

   Chuỗi hiển thị mang cả mã NV ở cuối — vừa để phân biệt hai người trùng
   tên, vừa là chỗ dò ngược về đúng người khi người dùng gõ tay.
   ==================================================================== */
function stdPickLabel(e){
  return (e.name||e.id)+' · '+(e.team||t('chưa phân nhóm'))+' · '+e.id;
}
/* Chuỗi người dùng gõ → mã NV. Mơ hồ thì trả '' chứ KHÔNG đoán: đoán sai ở
   đây là đổi nhóm nhầm người. */
function stdPickResolve(v){
  const s=String(v||'').trim();
  if(!s)return '';
  const list=activeEmps();
  let e=list.find(x=>stdPickLabel(x)===s);            // chọn thẳng từ gợi ý
  if(e)return e.id;
  e=list.find(x=>x.id===s);                           // gõ đúng mã NV
  if(e)return e.id;
  const k=noAccent(s).toLowerCase();
  const hit=list.filter(x=>noAccent(x.name||'').toLowerCase().indexOf(k)>=0
                        || noAccent(x.id).toLowerCase().indexOf(k)>=0);
  return hit.length===1?hit[0].id:'';
}
function stdPickerHtml(dlId,list,curId,onchange,ph,style){
  const cur=curId?empById(curId):null;
  return `<input class="inp sm" list="${dlId}" style="${style||''}"
      value="${cur?esc(stdPickLabel(cur)):''}"
      placeholder="${esc(ph||t('Gõ tên hoặc mã NV…'))}" onchange="${onchange}">
    <datalist id="${dlId}">${list.map(e=>
      `<option value="${esc(stdPickLabel(e))}"></option>`).join('')}</datalist>`;
}
/* Ai được phép chọn: người CÒN TRONG BIÊN CHẾ ở kỳ đang xem.
   KHÔNG cắt theo "có ngày nghỉ hay không" — người nghỉ ngày 06/09 vẫn đi
   làm suốt kỳ 21/08→20/09, vẫn phải đổi nhóm được như mọi người. */
function stdPickList(){
  const days=daysOfPeriod(stdCurYm());
  const p=periodFor(stdCurYm());
  return activeEmps().filter(e=>{
    if(inServiceRange(e,p.from,p.to))return true;
    /* Người đang khai SAI (vào làm sau ngày nghỉ…) rơi ra ngoài biên chế,
       nhưng vẫn phải chọn được — không thì không có cách nào sửa cho họ. */
    const w=stdWhyBlank(e,days);
    return !!(w&&STD_WHY[w].bad);
  });
}
function stdSwapSelHtml(w,cur){
  return stdPickerHtml('swDl'+w,stdPickList(),cur,
    `stdSetSwap('${w}',this.value)`,'',"min-width:210px");
}

/* =================== MỘT THẺ NHÓM =================== */
function stdPosSelHtml(e){
  const cur=posCode(e);
  return `<select class="inp sm std-pos" onchange="stdSetPos('${e.id}',this.value)">
    <option value=""${cur?'':' selected'}>${t('— chọn vị trí —')}</option>
    ${POSITIONS.map(p=>`<option value="${p.v}"${cur===p.v?' selected':''}>${esc(t(p.l))}</option>`).join('')}
  </select>`;
}
function stdTeamSelHtml(e){
  const cur=e.team||'';
  const list=stdAllTeams().filter(x=>x!=='');
  return `<select class="inp sm std-tm" onchange="stdMove('${e.id}',this.value)">
    ${list.map(tm=>`<option value="${esc(tm)}"${cur===tm?' selected':''}>${
      esc(stdTeamName(tm))}</option>`).join('')}
    <option value=""${cur?'':' selected'}>${t('(chưa phân nhóm)')}</option>
  </select>`;
}
/* `days` = khoảng của kỳ đang xem.
   Người đã khai ngày nghỉ mà ngày ấy còn Ở PHÍA TRƯỚC thì vẫn đang đi làm —
   phải sửa được tên, vị trí, nhóm y như mọi người, chỉ thêm một cái nhãn
   nhắc. Chỉ khi họ đã ra khỏi biên chế TRỌN kỳ đang xem mới làm mờ. */
/* ★ v9.7 — nút ✕ LUÔN hiện trên mọi dòng, kể cả người đã có lịch hoặc đã
   khai nghỉ việc: một dòng KHAI SAI phải xoá được thì mới khai lại được.
   Lời hỏi trong stdRemove() kể rõ sẽ mất gì và tự tải file .json sao lưu
   trước khi xoá — chặn ở nút là chặn nhầm, chặn ở lời hỏi mới đúng chỗ. */
function stdMemberHtml(e,days){
  const from=(days&&days[0])||todayIso(), to=(days&&days[days.length-1])||todayIso();
  const why=stdWhyBlank(e,days);
  const bad=!!(why&&STD_WHY[why].bad);
  const gone=why==='outservice';
  const left=!!e.leftAt;
  /* Khai sai thì BUNG SẴN dải ngày ra — bắt người dùng đi tìm nút mở mới sửa
     được là một cách khác để giấu lỗi. */
  const life=!!stdLifeOpen[e.id]||bad||!!e.joinAt;
  /* ★ v9.8 — khai riêng: bung sẵn khi vừa bấm nút, hoặc khi người này đang
     khai riêng mà nhóm lại thiếu mốc (đúng chỗ cần sửa). */
  const f=stdEff(e);
  const ownOpen=!!stdOwnOpen[e.id];
  return `<div class="std-mw${bad?' bad':''}${f.own?' own':''}"><div class="std-m${
    gone?' left':(left?' leaving':'')}">
    <input class="inp sm std-name" value="${esc(e.name||'')}"
           placeholder="${t('Họ tên')}" onchange="stdSetName('${e.id}',this.value)">
    <input class="inp sm std-id" value="${esc(e.id)}"
           title="${esc(t('Mã nhân viên — cũng là tên đăng nhập'))}"
           onchange="changeId('${e.id}',this.value)">
    ${stdPosSelHtml(e)}
    ${stdTeamSelHtml(e)}
    <!-- ☑ / 🚫 chứ KHÔNG dùng 📅: js/00-icons.js gộp 📅 · 🗓 · 📆 về cùng một
         icon 'calendar', mà nút bên cạnh (dải ngày vào/ra) đã là 📆 rồi —
         hai nút cạnh nhau vẽ ra y hệt thì bấm nhầm là chuyện sớm muộn. -->
    <button class="std-x${e.noSched?' off':''}" onclick="stdToggleSched('${e.id}')"
      title="${esc(e.noSched?t('Đang KHÔNG xếp lịch (thư ký / cấp trên) — bấm để đưa vào bảng ca')
                            :t('Đang có xếp lịch — bấm để bỏ khỏi bảng ca'))}">${
      e.noSched?'🚫':'☑'}</button>
    <button class="std-x${life?' on':''}" onclick="stdToggleLife('${e.id}')"
      title="${esc(t('Ngày vào làm / ngày làm việc cuối — hai ngày này CẮT LỊCH'))}">📆</button>
    <!-- ★ v9.8 — kiểu ca / mốc RIÊNG của người này, đè lên khai báo nhóm -->
    <button class="std-x${(ownOpen||f.own)?' own':''}" onclick="stdToggleOwn('${e.id}')"
      title="${esc(f.own?t('Đang chạy khai RIÊNG — bấm để xem hoặc bỏ')
                        :t('Đặt kiểu ca / mốc RIÊNG cho người này (khác cả nhóm)'))}">⚙</button>
    ${left?`<span class="std-left" title="${esc(t('Ngày làm việc cuối cùng'))}">🚪 ${
        fmtVNfull(e.leftAt)}</span>
      <button class="std-x" onclick="stdUnleave('${e.id}')" title="${
        esc(t('Bỏ khai nghỉ việc'))}">↩︎</button>`
      :`<button class="std-x" onclick="openLeaveBox('${e.id}')" title="${
        esc(t('Khai nghỉ việc'))}">🚪</button>`}
    <button class="std-x del" onclick="stdRemove('${e.id}')" title="${
      esc(t('Xoá hẳn khỏi dữ liệu — có sao lưu .json trước khi xoá'))}">✕</button>
  </div>
  ${why?`<div class="std-why${bad?' bad':''}">${STD_WHY[why].ic} ${t(STD_WHY[why].l)}${
    bad?` — <b>${t('người này sẽ KHÔNG có ô lịch nào')}</b>`:''}${
    /* Sửa một chạm ngay tại chỗ báo lỗi. Báo lỗi mà bắt người dùng đi tìm
       chỗ sửa thì mới đi được nửa đường. */
    why==='badrange'?`
      <button class="std-fix" onclick="stdSetLife('${e.id}','joinAt','')">${
        t('Gỡ ngày vào làm')}</button>
      <button class="std-fix" onclick="stdSetLife('${e.id}','leftAt','')">${
        t('Gỡ ngày nghỉ việc')}</button>`
    :why==='noteam'?`<span class="muted sm2">${t('— chọn nhóm ở ô bên phải')}</span>`
    :why==='noanchor'?`<span class="muted sm2">${
        f.ownTypeOn?t('— điền ô Mốc riêng (nút ⚙), hoặc đặt mốc cho cả nhóm')
                   :t('— điền ô Mốc ở đầu thẻ nhóm')}</span>`
    :''}</div>`:''}
  ${(f.own&&!ownOpen)?`<div class="std-ownline">⚙ <b>${t('Khai riêng')}</b>: ${
    esc(stdTypeLabel(f.shiftType))}${f.ownA1On?` · ${t('mốc')} ${fmtVNfull(f.a1)}`:''}
    <span class="muted sm2">${t('(cả nhóm:')} ${esc(stdTypeLabel(stdDecl(e.team||'').shiftType))}${
      stdHasCycle(stdDecl(e.team||'').shiftType)&&stdDecl(e.team||'').a1
        ? ' · '+fmtVNfull(stdDecl(e.team||'').a1):''})</span>
    <button class="std-fix ok" onclick="stdToggleOwn('${e.id}')">${t('Sửa')}</button>
    <button class="std-fix" onclick="stdClearOwn('${e.id}')">${t('Theo nhóm trở lại')}</button>
  </div>`:''}
  ${ownOpen?`<div class="std-own">
    <div class="std-own-h">⚙ <b>${t('Khai riêng cho người này')}</b>
      <span class="muted sm2">${t('Bỏ trống = chạy y hệt nhóm. Đã khai riêng thì đổi khai báo nhóm KHÔNG đụng tới người này.')}</span></div>
    <div class="std-own-r">
      <label class="std-f">${t('Kiểu ca riêng')}
        <select class="inp sm" onchange="stdSetOwn('${e.id}','ownType',this.value)">
          <option value=""${f.ownTypeOn?'':' selected'}>${t('— theo nhóm —')} (${
            esc(stdTypeLabel(stdDecl(e.team||'').shiftType))})</option>
          ${STD_TYPES.map(x=>`<option value="${x.v}"${f.ownType===x.v?' selected':''}
            >${x.ic} ${t(x.l)}</option>`).join('')}
        </select></label>
      ${stdHasCycle(f.shiftType)?`<label class="std-f">${t('Mốc riêng')}
        <input type="date" class="inp sm" value="${e.ownA1||''}"
          onchange="stdSetOwn('${e.id}','ownA1',this.value)"></label>
        <span class="muted sm2">${t('Bỏ trống ô Mốc riêng = lấy mốc của nhóm')}${
          stdDecl(e.team||'').a1?(' ('+fmtVNfull(stdDecl(e.team||'').a1)+')'):''}</span>`
        :`<span class="muted sm2">${t('Kiểu ca này không có chu kỳ nên không cần mốc')}</span>`}
      <span style="flex:1"></span>
      ${f.own?`<button class="std-fix" onclick="stdClearOwn('${e.id}')">${
        t('Theo nhóm trở lại')}</button>`:''}
      <button class="std-fix ok" onclick="stdToggleOwn('${e.id}')">${t('Thu lại')}</button>
    </div>
    <div class="std-own-p"><span class="muted sm2">${t('Lịch dự kiến của người này trong kỳ đang xem')}:</span>
      ${stdEmpStripHtml(e,days)}</div>
  </div>`:''}
  ${life?`<div class="std-life">
    <label class="std-f">${t('Ngày vào làm')}
      <input type="date" class="inp sm" value="${e.joinAt||''}"
        onchange="stdSetLife('${e.id}','joinAt',this.value)"></label>
    <label class="std-f">${t('Ngày làm việc cuối')}
      <input type="date" class="inp sm" value="${e.leftAt||''}"
        onchange="stdSetLife('${e.id}','leftAt',this.value)"></label>
    <span class="muted sm2">${t('Bỏ trống cả hai = đi làm suốt. Hai ngày này cắt lịch ở mọi kỳ.')}</span>
  </div>`:''}
  </div>`;
}
function stdTeamCardHtml(tm,days){
  const mem=stdMembers(tm);
  const none=(tm==='');
  const d=none?null:stdDecl(tm);
  const gaps=stdTeamGaps(tm,days[0]);
  const ownc=none?0:stdOwnCount(tm);
  const shut=!!stdShut[tm];
  const title=none?('❓ '+t('Chưa phân nhóm'))
        :((isOfficeTeam(tm)?'🏢 ':'👥 ')+esc(stdTeamName(tm)));
  const col=(typeof teamColor==='function'&&!none)?teamColor(tm):'#E2E8F0';
  return `<div class="card std-team${none?' std-none':''}${gaps.length?' warn':''}">
    <div class="std-h" style="border-left-color:${col}">
      <button class="std-fold" onclick="stdToggleTeam('${esc(tm)}')">${shut?'▸':'▾'}</button>
      <b>${title}</b>
      <span class="std-n">${stdCountLabel(mem.length)}</span>
      ${gaps.length?`<span class="std-gap">⚠ ${t('thiếu')} ${
        gaps.map(x=>t(x==='boardman'?'DCS Boardman':'Field Engineer')).join(' + ')}</span>`:''}
      ${ownc?`<span class="std-ownc" title="${esc(t('Những người này chạy kiểu ca hoặc mốc RIÊNG, không theo khai báo của nhóm'))
        }">⚙ ${ownc} ${t('khai riêng')}</span>`:''}
      <span style="flex:1"></span>
      ${none?`<span class="muted sm2">${t('Chọn nhóm ở ô bên phải mỗi dòng để xếp họ vào tổ')}</span>`
        :`<label class="std-f">${t('Kiểu ca')}
            <select class="inp sm" onchange="stdSetTeam('${esc(tm)}','shiftType',this.value)">
              ${STD_TYPES.map(x=>`<option value="${x.v}"${d.shiftType===x.v?' selected':''}
                >${x.ic} ${t(x.l)}</option>`).join('')}
            </select></label>
          ${stdHasCycle(d.shiftType)?`<label class="std-f">${t('Mốc')}
            <input type="date" class="inp sm" value="${d.a1||''}"
              onchange="stdSetTeam('${esc(tm)}','a1',this.value)"></label>`:''}`}
    </div>
    ${shut?'':`
      ${none?'':`<div class="std-sub muted sm2">${t('Chu kỳ')}: ${esc(t(stdTypeInfo(d.shiftType).sub))}${
          ownc?` · <b>⚙ ${ownc} ${t('người khai riêng — dải dưới đây là của NHÓM, xem dải riêng ở từng dòng')}</b>`:''}</div>
        ${stdStripHtml(tm,days)}`}
      <div class="std-ms">${mem.length?mem.map(x=>stdMemberHtml(x,days)).join('')
        :`<p class="muted sm2" style="padding:6px 2px">${t('Nhóm này chưa có ai.')}</p>`}</div>
      ${none?'':`<button class="btn sec sm" onclick="stdAddTo('${esc(tm)}')">＋ ${
        t('Thêm người vào')} ${esc(stdTeamName(tm))}</button>`}`}
  </div>`;
}

/* ============================================================
   THẺ TỰ KIỂM   ★ v9.7
   ------------------------------------------------------------
   Ba loại trục trặc dưới đây có chung một triệu chứng — "lịch không ra như
   khai" — mà không loại nào tự nói ra được ở đâu cả:

     · bia mộ đè lên người còn sống  → ghi lịch xong bị xoá lại lặng lẽ
     · người không xếp được lịch      → dòng trống trên bảng ca
     · dữ liệu chưa ghi được lên máy chủ → máy khác thấy bản cũ

   Gom vào một thẻ, mỗi mục kèm nút xử lý ngay tại chỗ. Sạch cả ba thì thẻ
   thu về một dòng xanh — không chiếm chỗ, nhưng vẫn nhìn thấy được là đã
   kiểm.
   ============================================================ */
function stdSelfCheck(days){
  const tombs=(typeof tombLivingHits==='function')?tombLivingHits():[];
  const probs=stdProblems(days);
  const dirty=(typeof fbPending==='function')?fbPending():false;
  return {tombs,probs,dirty,ok:!tombs.length&&!probs.length&&!dirty};
}
/* Gỡ mọi bia mộ đang đè lên người còn trong danh sách, rồi tạo lại lịch. */
function stdFixTombs(){
  if(!hrGuard())return;
  const n=(typeof tombLiftLiving==='function')?tombLiftLiving():0;
  if(!n){toast(t('Không có bia mộ nào cần gỡ'));renderStdShift();return;}
  save();
  toast('🪦 '+t('Đã gỡ')+' '+n+' '+t('bia mộ lạc — bấm Tạo ca chuẩn để xếp lại lịch'));
  renderStdShift();
  if(typeof renderBoth==='function')renderBoth();
}
function stdCheckHtml(days){
  const c=stdSelfCheck(days);
  if(c.ok)return `<div class="card std-chk ok"><b>✅ ${t('Tự kiểm')}</b>
    <span class="muted sm2">${t('Không có bia mộ lạc, không ai bị kẹt lịch, dữ liệu đã đồng bộ.')}</span></div>`;
  return `<div class="card std-chk bad">
    <b>🔎 ${t('Tự kiểm — có việc cần xử lý')}</b>
    ${c.tombs.length?`<div class="chk-row">🪦 <b>${c.tombs.length}</b> ${
      t('mã NV còn bia mộ dù người vẫn trong danh sách')}: ${
      c.tombs.map(x=>esc(x.name)+' ('+x.branches.join(', ')+')').join(' · ')}
      <div class="muted sm2">${t('Bia mộ là dấu "id này đã xoá" dùng để chống hồi sinh dữ liệu. Còn nó thì mọi ô lịch vừa ghi cho mã NV ấy sẽ bị xoá lại ngay lúc lưu — bấm Tạo bao nhiêu lần dòng vẫn trống.')}</div>
      <button class="btn warn sm" onclick="stdFixTombs()">${t('Gỡ bia mộ lạc')}</button></div>`:''}
    ${c.probs.length?`<div class="chk-row">⛔ <b>${c.probs.length}</b> ${
      t('người sẽ không có ô lịch nào')}: ${
      c.probs.map(x=>esc(x.e.name||x.e.id)+' ('+t(STD_WHY[x.why].l)+')').join(' · ')}</div>`:''}
    ${c.dirty?`<div class="chk-row">☁️ ${
      t('Còn thay đổi CHƯA ghi được lên máy chủ — máy khác đang thấy bản cũ.')}
      <button class="btn sec sm" onclick="if(typeof fbResync==='function')fbResync()">🔄 ${
      t('Đồng bộ lại')}</button></div>`:''}
  </div>`;
}

/* =================== CẢ MÀN =================== */
function renderStdShift(){
  const box=$('stdBox');if(!box)return;
  stdTeamsDecl();
  const ym=stdCurYm();
  const p=periodFor(ym);
  const days=daysOfPeriod(ym);
  if(!stdBaseDay)stdBaseDay=p.from;
  const teams=stdAllTeams();
  const noTeam=stdMembers('').length;
  const gapTeams=STD_SHIFT_TEAMS.filter(tm=>stdTeamGaps(tm,p.from).length);
  const leavers=stdPendingLeavers();
  const probs=stdProblems(days);
  const filled=activeEmps().filter(e=>S.base[e.id]&&days1Has(S.base[e.id],p.from,p.to)).length;
  box.innerHTML=`
  <div class="card std-top">
    <h3>🗓️ ${t('Ca chuẩn của tổ')}
      <span style="flex:1"></span>
      <span class="muted sm2">${t('Linh hoạt từng người khai ở tab Lịch → Thực tế → Áp pattern')}</span></h3>
    <div class="std-bar">
      <button class="btn sec sm" onclick="stdShiftYm(-1)" title="${esc(t('Kỳ trước'))}">◀</button>
      <select class="inp" style="font-weight:700;width:auto" onchange="stdSetYm(this.value)">
        ${stdYmList().map(m=>`<option value="${m}"${m===ym?' selected':''}>${
          esc(periodFor(m).slim)}</option>`).join('')}
      </select>
      <button class="btn sec sm" onclick="stdShiftYm(1)" title="${esc(t('Kỳ sau'))}">▶</button>
      <button class="btn ok" onclick="stdDoBuild()">⚡ ${t('Tạo ca chuẩn cho kỳ này')}</button>
      <span class="sp" style="flex:1"></span>
      <label class="std-f">${t('Ngày gốc')}
        <input type="date" class="inp sm" value="${stdBaseDay}"
          onchange="stdBaseDay=this.value"></label>
      <button class="btn sec sm" onclick="stdStagger(stdBaseDay)"
        title="${esc(t('Nhóm A = ngày gốc, B lệch 2 ngày, C lệch 4, D lệch 6'))}">↔ ${
        t('Rải mốc 4 nhóm')}</button>
      <button class="btn sec sm" onclick="stdAddTo('')">＋ ${t('Thêm người')}</button>
    </div>
    <!-- ★ v9.7 — lối vào nửa dưới của màn Quản trị. Nó nằm trong một khối
         <details> đóng sẵn, dưới cả danh sách nhân sự; không có mấy nút này
         thì gần như không ai tìm ra. -->
    <div class="std-bar std-sys admin-only">
      <span class="muted sm2">${t('Quản trị hệ thống')}:</span>
      <button class="btn sec sm" onclick="stdOpenSys('#accCard')">🔑 ${
        t('Tài khoản · mật khẩu · phân quyền')}</button>
      <button class="btn sec sm" onclick="stdOpenSys('#hoursCard')">⏱️ ${
        t('Mã ca & giờ công')}</button>
      <button class="btn sec sm" onclick="stdOpenSys()">⚙️ ${
        t('Cài đặt hệ thống & dữ liệu')}</button>
    </div>
    <div class="std-swap">
      <b>⇄ ${t('Đổi nhóm hai người')}</b>
      ${stdSwapSelHtml('a',stdSwapA)}
      <span class="sw-x">⇄</span>
      ${stdSwapSelHtml('b',stdSwapB)}
      <button class="btn sm" onclick="stdDoSwap()" ${(stdSwapA&&stdSwapB)?'':'disabled'}>${
        t('Đổi')}</button>
      <span class="muted sm2">${t('Hai người tráo nhóm cho nhau trong một lần bấm — không có lúc nào một nhóm bị trống.')}</span>
    </div>
    <div class="std-say">
      ${filled?`<span class="ok">✅ ${p.label} — ${t('đã có lịch chuẩn cho')} ${filled} ${t('người')}</span>`
              :`<span class="warn">⚠ ${p.label} — ${t('chưa tạo ca chuẩn')}</span>`}
      ${noTeam?`<span class="warn">⚠ ${noTeam} ${t('người chưa phân nhóm')}</span>`:''}
      ${gapTeams.length?`<span class="warn">⚠ ${t('Nhóm')} ${gapTeams.join(' · ')} ${
        t('còn thiếu vị trí')}</span>`:''}
      ${probs.length?`<span class="bad">⛔ ${t('KHÔNG xếp được lịch cho')}: ${
        probs.map(x=>esc(x.e.name||x.e.id)+' ('+t(STD_WHY[x.why].l)+')').join(' · ')}</span>`:''}
      ${leavers.length?`<span class="gone">🚪 ${leavers.length} ${
        t('người đã khai nghỉ việc — sang kỳ sau sẽ tự gỡ khỏi danh sách')}</span>`:''}
    </div>
    <p class="muted sm2" style="margin:8px 0 0">${
      t('Mỗi nhóm một kiểu ca và một mốc; ai trong nhóm chạy y hệt nhau. Bấm Tạo ca chuẩn thì phần mềm ghi lịch cho ĐÚNG kỳ đang chọn — kỳ khác không bị đụng, lịch thực tế đã sửa tay cũng giữ nguyên.')}</p>
  </div>
  ${stdCheckHtml(days)}
  ${teams.map(tm=>stdTeamCardHtml(tm,days)).join('')}`;
  if(typeof i18nApply==='function')i18nApply();
}
/* ============================================================
   TÊN CŨ — mọi tab gọi renderSetup() để vẽ màn Quản trị.
   ------------------------------------------------------------
   ★ v9.7 — SỬA LỖI "BẢNG TÀI KHOẢN BIẾN MẤT".

   Màn Quản trị có hai nửa. Nửa trên là Ca chuẩn (#stdBox), do file này
   dựng. Nửa dưới — trong khối gập "⚙️ Cài đặt hệ thống & dữ liệu" của
   index.html — là bảng giờ công theo mã ca, BẢNG TÀI KHOẢN & PHÂN QUYỀN &
   ĐẶT LẠI MẬT KHẨU, cấu hình Firebase, uỷ quyền duyệt cấp cuối, định mức
   quân số, cài đặt in. Nửa dưới do `renderData()` (js/11-stats-data.js) đổ
   dữ liệu vào.

   Từ v9.3, tab "Dữ liệu" bị gộp vào tab Quản trị và `renderSetup()` được
   viết lại thành một dòng gọi `renderStdShift()`. Không ai gọi
   `renderData()` nữa. Khung HTML vẫn còn nguyên trong index.html nên
   không có lỗi nào nổ ra — chỉ là mọi bảng ở nửa dưới RỖNG và mọi ô cài
   đặt trắng trơn. Người dùng thấy: "bảng kiểm soát chức năng, kiểm soát
   pass, tài khoản bị ẩn đi đâu mất". Chú thích ở js/12-main.js còn ghi
   "renderSetup() đã gọi renderData()" — đúng ở v9.2, sai từ v9.3.

   Nay gọi lại, và bọc try/catch: một ô cài đặt hỏng không được phép kéo
   theo cả màn Ca chuẩn.
   ============================================================ */
function renderSetup(){
  renderStdShift();
  if(typeof renderData==='function'){
    try{renderData();}catch(err){console.warn('[setup] renderData',err);}
  }
}
/* Mở khối cài đặt và cuộn tới đúng thẻ. Nút ở thanh đầu màn gọi hàm này —
   một khối <details> đóng nằm dưới ba màn hình cuộn thì coi như không có. */
function stdOpenSys(sel){
  const d=document.querySelector('details.hr-sys');
  if(!d){toast(t('Không tìm thấy khối cài đặt'));return;}
  d.open=true;
  if(typeof renderData==='function'){try{renderData();}catch(err){}}
  const el=sel?document.querySelector(sel):d;
  setTimeout(()=>{(el||d).scrollIntoView({behavior:'smooth',block:'start'});},60);
}

/* =================== HỘP KHAI NGHỈ VIỆC =================== */
let lvId='',lvDay='';
function openLeaveBox(id){
  if(!hrGuard())return;
  lvId=id||'';
  lvDay=todayIso();
  const m=$('lvMask');if(!m)return;
  m.classList.add('on');
  renderLeaveBox();
}
function closeLeaveBox(){const m=$('lvMask');if(m)m.classList.remove('on');}
function lvSet(f,v){
  if(f==='id'){
    const id=stdPickResolve(v);
    if(v&&!id)toast(t('Không tìm ra ai khớp — chọn từ danh sách gợi ý'));
    lvId=id;
  }else lvDay=v;
  renderLeaveBox();
}
function renderLeaveBox(){
  const box=$('lvBody');if(!box)return;
  const e=lvId?empById(lvId):null;
  const list=activeEmps().filter(x=>!x.leftAt);
  const per=lvDay?periodFor(schedMonthOf(lvDay)):null;
  box.innerHTML=`
  <h3>🚪 ${t('Khai nghỉ việc')}
    <span style="flex:1"></span>
    <button class="btn sec sm" onclick="closeLeaveBox()">✕</button></h3>
  <p class="muted sm2" style="margin:-4px 0 12px">${
    t('Từ hôm sau ngày làm việc cuối cùng, lịch của người này TRẮNG — cả ca chuẩn lẫn ca thực tế. Sang kỳ sau phần mềm tự gỡ tên khỏi danh sách và chặn đăng nhập, nhưng bảng công và đơn các kỳ trước vẫn tra được.')}</p>
  <div class="pat-grid">
    <label class="fl">${t('Người nghỉ việc')}
      ${stdPickerHtml('lvDl',list,lvId,"lvSet('id',this.value)")}</label>
    <label class="fl">${t('Ngày làm việc cuối cùng')}
      <input type="date" class="inp" value="${lvDay}" onchange="lvSet('day',this.value)"></label>
  </div>
  ${e&&lvDay?`<div class="pat-sum" style="margin-top:12px">
    <b>${esc(e.name||e.id)}</b> — ${t('lịch từ')} <b>${fmtVNfull(addDaysIso(lvDay,1))}</b> ${
      t('trở đi sẽ trắng')}.<br>
    ${t('Tên còn nằm trong danh sách hết')} ${per?esc(per.short):''}, ${
      t('sang kỳ sau tự gỡ.')}</div>`:''}
  <div class="row" style="margin-top:14px;gap:8px">
    <span style="flex:1"></span>
    <button class="btn sec" onclick="closeLeaveBox()">${t('Đóng')}</button>
    <button class="btn warn" onclick="stdDoLeave()" ${(e&&lvDay)?'':'disabled'}>🚪 ${
      t('Khai nghỉ việc')}</button>
  </div>`;
  if(typeof i18nApply==='function')i18nApply();
}
function stdDoLeave(){
  const e=lvId?empById(lvId):null;
  if(!e||!lvDay){toast(t('Chọn người và ngày làm việc cuối cùng'));return;}
  if(!confirm(t('Khai nghỉ việc cho')+' '+(e.name||e.id)+'?\n'
    +t('Ngày làm việc cuối cùng:')+' '+fmtVNfull(lvDay)+'\n'
    +t('Lịch từ hôm sau trở đi sẽ bị xoá.')))return;
  const r=stdLeave(lvId,lvDay);
  if(!r)return;
  closeLeaveBox();
  toast('🚪 '+r.name+' — '+t('đã xoá')+' '+r.n+' '+t('ô lịch sau ngày')+' '+fmtVNfull(lvDay)
      +(r.dead?(' · '+r.dead+' '+t('đơn chờ duyệt rơi sau ngày nghỉ, nhớ đóng lại')):''));
}
