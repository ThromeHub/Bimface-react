/**
 * 同步更新status
 * @param params 键值对
 */
export function change(params: object) {
  return new Promise(resolve => this.setState(params, _ => resolve()))
}

// 加载脚本
export function loadScript(url, cb) {
  let script = document.createElement("script");
  script.type = "text/javascript";
  script.onload = () => cb && cb();
  script.src = url;
  document.head.appendChild(script)
}