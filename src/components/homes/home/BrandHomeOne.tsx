
"use client"
import React from 'react'

import { Autoplay } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
const brand_data = [
  "/assets/img/08dbb3ce-181c-4f36-8ab8-8c8f94cf174b.svg",
  "/assets/img/08dbb3ce-181c-5092-8f78-f40213d3d315.svg",
  "/assets/img/08dbb3ce-181c-4fde-8668-b2bb31d25893.svg",
  "/assets/img/08dbb3ce-181c-5024-823f-d878c31298eb.svg",
  "/assets/img/08dbb3ce-181c-5131-8a69-f43eeaf5298d.svg",
  "/assets/img/08dbb3ce-181c-4f36-8ab8-8c8f94cf174b.svg",
  "/assets/img/08dbb3ce-181c-5092-8f78-f40213d3d315.svg",
  "/assets/img/08dbb3ce-181c-4fde-8668-b2bb31d25893.svg",
  "/assets/img/08dbb3ce-181c-5024-823f-d878c31298eb.svg",
  "/assets/img/08dbb3ce-181c-5131-8a69-f43eeaf5298d.svg",
]

interface PropsType {
  style_2?: boolean,
  style_3?: boolean,
}

export default function BrandHomeOne({ style_2, style_3 }: PropsType) {

  return (
    <>
      <section className={`sponsor-branding-section ${style_2 ? "section-padding p100-bg" : "space-top"} ${style_3 ? "section-padding white-bg" : ""}`}>
        <div className="container">
          <Swiper
            spaceBetween={30}
            slidesPerView={5}
            speed={1300}
            loop={true}
            centeredSlides={true}
            modules={[Autoplay]}
            autoplay={{
              delay: 2000,
              disableOnInteraction: false,
            }}
            breakpoints={{
              1199: {
                slidesPerView: 5,
              },
              991: {
                slidesPerView: 4,
              },
              767: {
                slidesPerView: 3,
              },
              575: {
                slidesPerView: 2,
              },
              0: {
                slidesPerView: 2,
              },
            }}
            className="swiper brand-slider">
            {brand_data.map((item, i) => (
              <SwiperSlide key={i} className="swiper-slide">
                <div className="brand-image">
                  <img src={item} alt="Đối tác" />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>
    </>
  )
}
