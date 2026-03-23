import { useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import FadeSection from "../FadeSection";

const FAQ_ITEMS = [
  {
    q_en: "Where does my donation go?",
    q_zh: "我的捐赠去向？",
    a_en: "35% funds our snake robot fleet, 25% goes to satellite monitoring, 20% to tree planting, 15% to field research, and 5% covers operations. We publish detailed quarterly reports.",
    a_zh: "35%用于蛇形机器人队伍，25%用于卫星监测，20%用于植树造林，15%用于实地研究，5%用于运营。我们发布详细的季度报告。",
  },
  {
    q_en: "Can I really watch my snake robot live?",
    q_zh: "我真的能看到我的蛇形机器人实时画面吗？",
    a_en: "Yes! Patron tier and above get access to live feeds from their adopted snake. The feed shows real-time desert patrol footage with vegetation detection overlays.",
    a_zh: "是的！守护者及以上等级可以观看认领机器人的实时画面，包含植被检测叠加信息的沙漠巡逻直播。",
  },
  {
    q_en: "How do I name my snake robot?",
    q_zh: "如何为我的蛇形机器人命名？",
    a_en: "After selecting a Patron or higher tier, you'll enter a name (up to 20 characters) and choose a patrol zone. Your snake's name appears on the live feed HUD.",
    a_zh: "选择守护者或更高等级后，您可以输入名称（最多20个字符）并选择巡逻区域。您的机器人名称将显示在直播画面上。",
  },
  {
    q_en: "Is this a real project?",
    q_zh: "这是一个真实的项目吗？",
    a_en: "This is a student research project focused on monitoring the Taklamakan Desert green belt. The satellite data is real (Sentinel-2 via Google Earth Engine). The snake robot is a working prototype.",
    a_zh: "这是一个专注于监测塔克拉玛干沙漠绿化带的学生研究项目。卫星数据来自真实的Sentinel-2数据（通过Google Earth Engine），蛇形机器人是一个可工作的原型。",
  },
  {
    q_en: "Can I cancel or change my tier?",
    q_zh: "我可以取消或更改等级吗？",
    a_en: "Monthly subscriptions can be canceled anytime. You can upgrade your tier at any point — your snake and naming rights carry over. Downgrades take effect at the next billing cycle.",
    a_zh: "月度订阅可以随时取消。您可以随时升级等级——您的机器人和命名权将保留。降级将在下一个计费周期生效。",
  },
  {
    q_en: "What data do I get access to?",
    q_zh: "我能获取什么数据？",
    a_en: "All tiers get community access. Patrons get weekly patrol reports. Guardians get a personal dashboard with snake stats, video highlights, and NDVI data for their zone.",
    a_zh: "所有等级都可访问社区。守护者获得每周巡逻报告。卫士获得个人仪表盘，包含机器人统计、视频精选和区域NDVI数据。",
  },
];

export default function DonationFAQ({ zh }) {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <FadeSection className="faq-section">
      <h2>{zh ? "常见问题" : "Frequently Asked Questions"}</h2>
      <div className="faq-list">
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className={`faq-item ${openIndex === i ? "open" : ""}`}>
            <button className="faq-question" onClick={() => setOpenIndex(openIndex === i ? null : i)}>
              <span>{zh ? item.q_zh : item.q_en}</span>
              {openIndex === i ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </button>
            <div className="faq-answer" style={{ maxHeight: openIndex === i ? 200 : 0 }}>
              <p>{zh ? item.a_zh : item.a_en}</p>
            </div>
          </div>
        ))}
      </div>
    </FadeSection>
  );
}
