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
  { id: 2, number: 300, text: "k+", title: "Giải thưởng" },
  { id: 3, number: 100, text: "+", title: "Dự án hoàn thành" },
  { id: 4, number: 900, text: "+", title: "Đánh giá khách hàng" },
]


interface PropsType {
  style_2?: boolean
}

export default function CounterHomeOne({ style_2 }: PropsType) {
  return (
    <>
      <section className={` position-relative ${style_2 ? "counter-section02" : "counter-section"}`}>
        <div className="container">
          <div className="counter-version-wrapv1 d-flex align-items-center justify-content-between gap-4">
            {coundet_data.map((item, i) => (
              <div key={i} className={`counter-items ${style_2 ? "style02" : ""}`}>
                {style_2 ?
                  <>
                    <div className="cont-bottom">
                      <img src="/assets/img/08dbb3ce-181c-4e80-833e-6c43bd5dd105.svg" alt="Biểu tượng thống kê" />
                    </div>
                    <div className="con-box">
                      <h2 className="d-flex align-items-center">
                        <span className="count"> <Count number={item.number} /> </span> {item.text}
                      </h2>
                      <p>{item.title}</p>
                    </div>
                  </>
                  :
                  <>
                    <h2 className="d-flex align-items-center">
                      <span className="count"> <Count number={item.number} /> </span> {item.text}
                    </h2>
                    <div className="cont-bottom">
                      <img src="/assets/img/08dbb3ce-181c-4e80-833e-6c43bd5dd105.svg" alt="Biểu tượng thống kê" />
                      <p>{item.title}</p>
                    </div>
                  </>

                }

              </div>
            ))}
 

            {
              style_2 &&
              <>
                <img src="assets/img/element/count-flower-left.png" alt="img" className="cout-flower-left" />
                <img src="assets/img/element/count-flower-right.png" alt="img" className="cout-flower-right" />
              </>
            }
          </div>
        </div>
      </section>
    </>
  )
}
