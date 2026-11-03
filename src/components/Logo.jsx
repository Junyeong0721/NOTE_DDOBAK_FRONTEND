// "또박" 손글씨 로고: 글자 뒤에 노란 형광펜을 한 번 그은 모양
export default function Logo({ size = 'large' }) {
  return <span className={`logo logo-${size}`}>또박</span>
}
