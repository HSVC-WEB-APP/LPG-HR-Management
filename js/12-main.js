/* ============================================================
   BOOT — khoi tao ung dung
   LPGT Cavern — Quan ly Cong Ca v4
   ============================================================ */
/* =================== BOOT =================== */
function renderAll(){
  syncAccounts();                 // mã NV mới → tự thành tài khoản đăng nhập
  /* Dọn thông báo đã lỗi thời sau mỗi lượt đồng bộ Firebase: máy khác vừa
     huỷ đơn / đổi người cover / trả ô lịch về ca chuẩn thì việc-chờ-xác-nhận
     tương ứng ở máy này phải biến mất theo. Có tiết chế 30 giây và chỉ ghi
     khi thật sự gỡ được cái gì (xem sweepStaleNotifs ở js/13-portal.js). */
  if(typeof sweepStaleNotifsThrottled==='function')sweepStaleNotifsThrottled();
  applyRoleUI();
  fillMonthSelects();renderCal();renderSetup();renderAppr();refreshBadge();  /* renderSetup() đã gọi renderData() */
  /* Băng "đang giữ thông báo lịch" — dựng lại sau mỗi lượt đồng bộ Firebase,
     để quản trị khác cũng thấy và bấm gửi hộ được (js/06-calendar.js). */
  if(typeof renderHoldBar==='function')renderHoldBar();
  /* Badge "còn chuyến tàu chưa chốt phương án" — js/25-vessel.js */
  if(typeof refreshVesselBadge==='function')refreshVesselBadge();
  renderGate();
  if(curView==='me')renderMe();
  if(curView==='rep')renderReport();
}

load();
applyPerm();                      // quyền lấy từ cột Quyền của người đang đăng nhập
fillMonthSelects();
syncAccounts();
/* Dọn thông báo lúc khởi động: (1) việc chờ đã lỗi thời — đơn đã xoá, ô lịch
   đã trả về ca chuẩn, đã đổi người cover; (2) tin cũ hơn ~2 kỳ công.
   Gộp một lần save() cho cả hai để chỉ tốn đúng một lượt ghi Firebase. */
{
  let _pn=0;
  if(typeof sweepStaleNotifs==='function')_pn+=sweepStaleNotifs(false);
  if(typeof pruneOldNotifs==='function')  _pn+=pruneOldNotifs();
  if(_pn)save();
  /* ★ v9.6 — DỌN DỮ LIỆU CŨ MỘT LẦN (js/28-stdshift.js):
       · dải chặng v9.4 (e.segs) → chép chặng đang hiệu lực về trường phẳng
       · hai nhóm ảo "DCS" / "Field" → gỡ tên nhóm, chờ xếp lại
       · sổ của màn Tái cơ cấu đã xoá (S.reorgs, e.pl2, planSegs, structLog)
       · suy sổ khai báo nhóm từ dữ liệu người đang có, nếu chưa có sổ
     Rồi chép khai báo NHÓM xuống từng người, vì 25 file còn lại đọc
     e.shiftType / e.a1 chứ không đọc sổ nhóm. */
  if(typeof stdMigrateV96==='function'&&stdMigrateV96())save();
  if(typeof stdSyncAll==='function')   stdSyncAll();
  /* Người đã nghỉ việc: sang kỳ mới thì gỡ khỏi danh sách và chặn đăng nhập;
     dọn nốt ô lịch lỡ có sau ngày làm việc cuối cùng. */
  if(typeof stdLeaverSweep==='function')stdLeaverSweep();
  if(typeof stdPurgeAfterLeft==='function')stdPurgeAfterLeft();
}
renderAll();
initFb();
/* Kỳ công cắt ngày 21. App để mở qua đêm phải TỰ nhảy sang kỳ mới, không
   thì sáng 21 mọi màn vẫn đang hiển thị kỳ cũ. Xem perStartWatch()
   ở js/04-schedule.js. */
if(typeof perStartWatch==='function')perStartWatch();

/* Màn hình đầu tiên sau khi đăng nhập: nhân viên → Trang chính;
   thư ký / quản lý người Hàn (không thuộc diện chấm công) → Lịch thực tế */
renderGate();
go(homeView());
renderMe(true);   /* nhóm noSelf nay cũng có Bảng tin — xem homeView() */

/* Ngôn ngữ: Quản lý người Hàn (quyền kmgr) mặc định vào là tiếng Anh,
   ai đã tự bấm nút EN/VI thì theo lựa chọn đã lưu. Xem js/14-i18n.js. */
applyLangForUser();
