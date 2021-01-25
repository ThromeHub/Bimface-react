/**
 * 同步更新status
 * @param params 键值对
 */
export function change(params:object) {
  return new Promise(resolve => this.setState(params, _=> resolve()))
}