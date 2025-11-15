function Footer() {
  return (
    <>
      <footer
        className="ftco-footer bg-bottom ftco-no-pt"
        style={{ backgroundImage: "url(images/bg_3.jpg)" }}
      >
        <div className="container">
          <div className="row mb-5">
            {/* Giới thiệu */}
            <div className="col-md pt-5">
              <div className="ftco-footer-widget pt-md-5 mb-4">
                <h2 className="ftco-heading-2">Giới thiệu</h2>
                <p>
                  Xa xa, phía sau những ngọn núi từ ngôn từ, cách các quốc gia
                  Vokalia và Consonantia, sống những văn bản mù.
                </p>
                
              </div>
            </div>

            {/* Thông tin */}
            <div className="col-md pt-5 border-left">
              <div className="ftco-footer-widget pt-md-5 mb-4 ml-md-5">
                <h2 className="ftco-heading-2">Thông tin</h2>
                
              </div>
            </div>

            {/* Trải nghiệm */}
            <div className="col-md pt-5 border-left">
              <div className="ftco-footer-widget pt-md-5 mb-4">
                <h2 className="ftco-heading-2">Trải nghiệm</h2>
                
              </div>
            </div>

            {/* Liên hệ */}
            <div className="col-md pt-5 border-left">
              <div className="ftco-footer-widget pt-md-5 mb-4">
                <h2 className="ftco-heading-2">Liên hệ</h2>
                
              </div>
            </div>
          </div>

          {/* Bản quyền */}
          <div className="row">
            <div className="col-md-12 text-center">
              <p>
                © Bản quyền thuộc về BiHappy | Thiết kế với{" "}
                <i className="fa fa-heart" aria-hidden="true" /> bởi{" "}
                <a href="https://colorlib.com" target="_blank">
                  @YourName
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default Footer;
