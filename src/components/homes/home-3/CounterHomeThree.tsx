
"use client"
import React from 'react'
import Count from '@/components/common/Count';

interface CountDataType {
  id: number;
  number: number;
  text: string;
  title: string;
}

const coundet_data: CountDataType[] = [
  { id: 1, number: 200, text: "+", title: "Thành viên đội ngũ" },
  { id: 2, number: 20, text: "+", title: "Giải thưởng" },
  { id: 3, number: 10, text: "k+", title: "Dự án hoàn thành" },
  { id: 4, number: 900, text: "+", title: "Đánh giá khách hàng" },
]

type Props = {
  style_2?: boolean
}

export default function CounterHomeThree({ style_2 }: Props) {
  return (
    <>
      <section className={`counter-sectionv03 position-relative ${style_2 ? "counter-main-section section-padding" : ""}`}>
        <div className="container">
          <div className="counter-version-wrapv1 d-flex align-items-center justify-content-between gap-4">

            {coundet_data.map((item, i) => (

              <React.Fragment key={i}>
                <div className="counter-items style02">
                  <div className="con-box">
                    <h2 className="d-flex align-items-center">
                      <span className="count"> <Count number={item.number} /> </span> {item.text}
                    </h2>
                    <p>{item.title}</p>

                  </div>
                </div>
                {i !== 3 &&
                  <div className="count-animal d-lg-block d-none">
                    <img src="assets/img/icon/count-animal.svg" alt="img" />
                  </div>
                }
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
