import React from "react";
import "./header.css";

export default function HwcHeader({
  logoSrc = "/assets/HWC-Logo-Light.png",
  homeHref = "https://www.hwcengineering.com/",
  alt = "HWC Engineering",
  title,
  right,
  children
}) {
  // right: optional convenience slot
  // children: optional extra content (filters/buttons/etc.)

  return (
    <header className="hwc-header" role="banner" aria-label="HWC header">
      <div className="hwc-header__inner">
        <div className="hwc-header__left">
          <a className="hwc-header__brand" href={homeHref} aria-label="Home">
            <img className="hwc-header__logo" src={logoSrc} alt={alt} />
          </a>

          {title ? (
            <>
              <span className="hwc-header__sep" aria-hidden="true">|</span>
              <span className="hwc-header__title" title={title}>{title}</span>
            </>
          ) : null}
        </div>

        <div className="hwc-header__right">
          {right}
          {children}
        </div>
      </div>
    </header>
  );
}
