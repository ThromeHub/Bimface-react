import React from 'react';
import GlobalContext from '@src/common/global-context';
import styles from './bimfaceGis.module.less';
import { RootDispatch, RootState } from '@src/store';
import { connect } from '@store/connect';

//antd
import { Button, DatePicker, Drawer, Form, message, Space } from 'antd';

function mapStateToProps(state: RootState) {
  const {
    login: { count },
  } = state;
  return { count };
}

function mapDispatchToProps(dispatch: RootDispatch) {
  const { login } = dispatch;
  return {
    increment: login.INCREMENT,
    decrement: login.decrement,
  };
}

@connect(mapStateToProps, mapDispatchToProps)

export default class BimfaceGis extends React.Component<any>{
  static contextType = GlobalContext;
  constructor(props, context) {
    super(props, context);
    this.state = {
      app: "",
      viewer: "",
      viewToken: "03fd580340034846aa645767a4111f15",
      constructList: [],
      exMemberId: "",
      exMemberMng: "",
    }
  }

  componentDidMount() {
    this.initeBimface();
  }

  initeBimface() {
    const { viewToken } = this.state;
    // 根据viewToken指定待显示的模型或图纸
    let loaderConfig = new BimfaceSDKLoaderConfig();
    loaderConfig.viewToken = viewToken;
    // 加载BIMFACE JSSDK加载器
    BimfaceSDKLoader.load(loaderConfig, viewMetaData => {
      // 设置WebApplication3D的配置项
      let webAppConfig = new Glodon.Bimface.Application.WebApplication3DConfig();
      webAppConfig.domElement = document.getElementById('domId');
      // 创建WebApplication3D，用以显示模型
      let app = new Glodon.Bimface.Application.WebApplication3D(webAppConfig);
      app.addView(viewToken)
      let viewer = app.getViewer();
      this.setState({ app, viewer }, () => {
        this.setEvent();
      })
    }, e => console.log("failure_load:", e))
  }

  setEvent() {
    const { viewer } = this.state;
    viewer.addEventListener("ViewAdded", e => {
      // 模型配置
      let mapConfig = new Glodon.Bimface.Plugins.TileMap.MapConfig();
      mapConfig.viewer = viewer;
      mapConfig.basePoint = { "x": -85689.088, "y": -62066.347 };           // 模型载入载入的基点  
      mapConfig.modelPosition = [121.63255566511255, 29.837958723638756]    // 模型载入基点所对应的经纬度（WGS84）    
      mapConfig.modelRotationZ = 0 * Math.PI / 180;                         // 设置模型的旋转弧度值
      mapConfig.modelAltitude = 0.0;                                        // 设置模型零零标高对应的高程值，单位为米
      // 构造地图对象
      let map = new Glodon.Bimface.Plugins.TileMap.Map(mapConfig);
      map.setMapSource({
        // credit: Glodon.Bimface.Common.Credit.Amap,
        // url: "https://webst01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=6&x={x}&y={y}&z={z}"
        url: "http://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer/tile/{z}/{y}/{x}"
      })
      viewer.render();
      this.setState({ map })
    })
  }

  render() {
    return (
      <div id="BimfaceGis" className={styles.BimfaceGis}>
        <main id="domId" className={styles.container} />
      </div>
    )
  }
}