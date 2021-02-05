import React from 'react';
import GlobalContext from '@src/common/global-context';
import styles from './bimfaceGis.module.less';
import { RootDispatch, RootState } from '@src/store';
import { connect } from '@store/connect';

import moment from 'moment'
//antd
import { Button, Drawer, Form, message, Select, Space } from 'antd';
const { Option } = Select;
import {
  AimOutlined,
  CarOutlined,
  EyeOutlined,
  FunnelPlotOutlined,
  HomeOutlined,
  LoginOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';

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
    // bind
    this.addODPoint = this.addODPoint.bind(this);
    // state
    this.state = {
      drawerShow: true,
      isViewshed: false,
      viewshedManager: "",                                    // 可视域管理器
      isLimitHeight: "",                                      // 是否开启控高分析
      heightLimitAnalysis: "",                                // 控高分析
      exMemberMng: "",                                        // 构件管理器
      ODAnimate: "",                                          // OD通勤图动画
      flyAnimate: "",                                         // 飞线图动画
      wallAnimate: "",                                        // 围墙动画
      points: [],                                             // 埋点集合
      spline: "",                                             // 埋点曲线
      app: "",
      map: "",
      viewer: "",
      viewToken: "03fd580340034846aa645767a4111f15",
      // viewToken: "1c0c8371ca1d4a7f9df986743074974b",
      constructList: [],
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
      // 构件控制器
      let exMemberMng = new Glodon.Bimface.Viewer.ExternalObjectManager(viewer)
      this.setState({ app, viewer, exMemberMng }, () => {
        this.setEvent();
      })
    }, e => console.log("failure_load:", e))
  }

  setEvent() {
    const { viewer } = this.state;
    // 模型加载时配置地图
    viewer.addEventListener("ViewAdded", e => {
      // 模型着色
      this.setStyle();
      // 设置服务
      this.setMap();
      viewer.render();
    })
    // 左键保存位置信息
    viewer.addEventListener("MouseClicked", (e) => {
      console.log(e.worldPosition, viewer.getCameraStatus())
      if (e.objectId)
        this.setState({ targetPosition: e.worldPosition })
    })
  }

  setMap() {
    const { viewer } = this.state;
    let mapConfig = new Glodon.Bimface.Plugins.TileMap.MapConfig();
    mapConfig.viewer = viewer;
    mapConfig.basePoint = { "x": -85689.088, "y": -62066.347 };           // 模型载入载入的基点  
    mapConfig.modelPosition = [121.63255566511255, 29.837958723638756]    // 模型载入基点所对应的经纬度（WGS84）    
    mapConfig.modelRotationZ = 0 * Math.PI / 180;                         // 设置模型的旋转弧度值
    mapConfig.modelAltitude = 0.0;                                        // 设置模型零零标高对应的高程值，单位为米
    // 构造地图对象
    let map = new Glodon.Bimface.Plugins.TileMap.Map(mapConfig);
    map.setMapSource({
      // credit: Glodon.Bimface.Common.Credit.Amap,         // 版权
      url: "http://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer/tile/{z}/{y}/{x}"
    })
    this.setState({ map })
  }

  setStyle() {
    const { viewer } = this.state;
    return 
    viewer.setBackgroundColor(new Glodon.Web.Graphics.Color(248, 248, 248, 1))
    // 河流
    viewer.overrideComponentsColorById(["69", "70"], new Glodon.Web.Graphics.Color(182, 222, 239, 0));
    // 底盘
    viewer.hideComponentsById(["3", "4", "5", "21", "19"]);
    // 线路
    viewer.overrideComponentsColorById(["9", "10", "11", "14", "17", "18"], new Glodon.Web.Graphics.Color(0, 22, 42, 0.1));
  }

  // 切换模型可视域
  toggleViewShed() {
    const { viewer, isViewshed, viewshedId, viewshedManager } = this.state;
    if (isViewshed) {
      console.log(viewshedManager)
      viewshedManager.removeById(viewshedId)
      viewshedManager.clear();
      this.setState({ viewshedId: "", viewshedManager: "" })
    } else {
      // 设置视角
      viewer.setCameraStatus({
        position: { x: 399197.6927405494, y: -63629.62437383297, z: 36676.82078441595 },
        target: { x: -201292.48796051997, y: 685313.1133083657, z: -482305.4934696139 },
        up: { x: -0.2974986819638406, y: 0.37104182057356094, z: 0.8796718147213964 }
      })
      // 构造可视域分析管理器
      let mngConfig = new Glodon.Bimface.Analysis.Viewshed.ViewshedManagerConfig();
      mngConfig.viewer = viewer;
      let viewshedManager = new Glodon.Bimface.Analysis.Viewshed.ViewshedManager(mngConfig);
      // 构造可视域对象
      let config = new Glodon.Bimface.Analysis.Viewshed.Viewshed3DConfig();
      config.position = { x: 378009.9204790529, y: -8583.420964820874, z: 7546.564179268196 };  //视点
      config.direction = { x: -0.9, y: -0.10, z: 0.05 } //方向
      config.visibleAreaColor = new Glodon.Web.Graphics.Color(99, 188, 66, 0.8);  //可视范围颜色
      config.hiddenAreaColor = new Glodon.Web.Graphics.Color(244, 166, 148, 0.8); //不可视范围颜色
      config.distance = 60000; // 可视范围
      config.horizontalFov = Math.PI / 4; // 可视角度
      config.verticalFov = Math.PI / 8;
      let viewshed = new Glodon.Bimface.Analysis.Viewshed.Viewshed3D(config);
      viewshedManager.addViewshed(viewshed);
      viewshedManager.update();
      // getId必须在update之后方能获取
      let viewshedId = viewshed.getId()
      this.setState({ viewshedId, viewshedManager })
    }
    viewer.render();
    this.setState(prev => { return { isViewshed: !prev.isViewshed } })
  }

  // 设置限高样式
  LimitHeight() {
    const { viewer, isLimitHeight, heightLimitAnalysis } = this.state;
    if (heightLimitAnalysis) {
      isLimitHeight
        ? heightLimitAnalysis.hide()
        : heightLimitAnalysis.show()
      heightLimitAnalysis.update()
    } else {
      // 设置视角
      viewer.setCameraStatus({
        position: { x: 125039.18370122703, y: -242387.30667969838, z: 241470.13837781825 },
        target: { x: 705596.9763040222, y: 382217.443164706, z: -439461.5710362263 },
        up: { x: 0.4248181220968849, y: 0.45704439987104817, z: 0.7814345651969777 },
      });
      // 构造控高分析配置项
      var config = new Glodon.Bimface.Analysis.HeightLimit.HeightLimitAnalysisConfig();
      // 设置控高分析颜色、控制高度、控高分析模式、控高分析的平面区域、viewer对象等参数
      config.color = new Glodon.Web.Graphics.Color(188, 66, 222, .6);
      config.height = 10000;
      config.mode = 'customized';
      config.area = { 'type': 'circle', 'center': { x: 339219, y: 13310, z: 14101 }, 'radius': 200000 };
      config.viewer = viewer;
      // 构造控高分析对象
      let heightLimitAnalysis = new Glodon.Bimface.Analysis.HeightLimit.HeightLimitAnalysis(config);
      this.setState({ heightLimitAnalysis })
    }
    viewer.render();
    this.setState(prev => { return { isLimitHeight: !prev.isLimitHeight } })
  }

  // 扫描效果
  scanEffect(type: String) {
    const { viewer, isScanEffect, scanEffect } = this.state;
    if (isScanEffect) {
      scanEffect.destroy();
    } else {
      // 设置视角
      viewer.setCameraStatus({
        position: { x: -107158.15343962245, y: -237356.44596605303, z: 199942.57446016822 },
        target: { x: 522880.5803750656, y: 392684.61054889293, z: -430093.851441898 },
        up: { x: 0, y: -0.000003673204932352431, z: 0.9999999999932537 },
      })
      // 构造扫描效果配置
      let config;
      switch (type) {
        case "ring": config = new Glodon.Bimface.Plugins.Animation.RingScanEffectConfig();
          break;
        case "fan": config = new Glodon.Bimface.Plugins.Animation.FanScanEffectConfig();
          break;
      }
      config.viewer = viewer;
      config.backgroundColor = new Glodon.Web.Graphics.Color(0, 0, 0, 0.05);
      config.color = new Glodon.Web.Graphics.Color(17, 218, 183, .6);
      config.duration = 3000;
      config.fanAngle = Math.PI;
      config.originPosition = { x: 38019.40931448743, y: -44459.791099034584, z: 9999.985515764005 };
      config.radius = 100000;
      config.progressive = 8; // 衰减力度
      // 构造扫描效果
      let scanEffect
      switch (type) {
        case "ring": scanEffect = new Glodon.Bimface.Plugins.Animation.RingScanEffect(config);
          break;
        case "fan": scanEffect = new Glodon.Bimface.Plugins.Animation.FanScanEffect(config);
          break;
      }
      scanEffect.show();
      this.setState({ scanEffect })
    }
    viewer.render();
    this.setState(prev => { return { isScanEffect: !prev.isScanEffect } })
  }


  /*
    定点绘制OD线
  */
  // 开始埋点
  async startODPoints() {
    const { viewer, ODAnimate } = this.state;
    if (ODAnimate) {
      ODAnimate.stop();
      await this.setState({ ODAnimate: "", points: [], spline: "" })
    }
    viewer.addEventListener("MouseClicked", this.addODPoint)
  }
  // 增加漫游埋点
  addODPoint(e) {
    const { viewer } = this.state;
    viewer.clearSelectedComponents();
    if (e.worldPosition) {
      this.drawODPoint(e.worldPosition)
    } else message.warning("请在模型范围内取点！")
  }
  // 标记漫游埋点
  drawODPoint(point: Object) {
    const { viewer, points } = this.state;
    points.push(point)
    // 标签
    let config = new Glodon.Bimface.Plugins.Drawable.CustomItemConfig();
    config.offsetX = -3;
    config.offsetY = -3;
    config.opacity = 0.8;
    let circle = document.createElement('div');
    circle.style.width = '6px';
    circle.style.height = '6px';
    circle.style.border = 'solid';
    circle.style.borderColor = '#FF0000';
    circle.style.borderWidth = '1px';
    circle.style.background = 'rgba(0,0,0,0)';
    circle.style.borderRadius = '50%';
    config.content = circle;
    config.draggable = false;
    config.viewer = viewer;
    config.worldPosition = point;
    let customItem = new Glodon.Bimface.Plugins.Drawable.CustomItem(config);
    // 标签容器
    let pointsConfig = new Glodon.Bimface.Plugins.Drawable.DrawableContainerConfig();
    pointsConfig.viewer = viewer;
    let pointsContainer = new Glodon.Bimface.Plugins.Drawable.DrawableContainer(pointsConfig);
    pointsContainer.addItem(customItem);
    this.setState({ points, pointsContainer })
  }

  // 获取漫游路径曲线
  getSplineCurve(points: Array, src: String, curveName: String, stretch: Boolean = false) {
    // return new THREE.CatmullRomCurve3([new THREE.Vector3(-7500, -15000, -450)])
    const { viewer, pointsContainer, exMemberMng } = this.state;
    // 清除埋点
    viewer.removeEventListener("MouseClicked", this.addODPoint)
    viewer.render();
    pointsContainer.clear();
    // 绘制曲线
    let color = new Glodon.Web.Graphics.Color(17, 218, 183, 1.0);
    let width = 6;
    let style = { "lineType": "Continuous", "lineStyle": null };
    let spline = new Glodon.Bimface.Plugins.Geometry.SplineCurve(points, color, width, style);
    if (stretch) spline.stretch();
    spline.setMap({ src, enableColorOverride: stretch }, () => {
      exMemberMng.addObject(curveName, spline)
    })//准许颜色覆盖
    this.setState({ spline })
    return spline
  }

  // OD通勤动画
  async ODAnimate() {
    const { viewer, points, exMemberMng } = this.state;
    if (points.length < 2) return message.warning("请先添加2个OD节点！")
    exMemberMng.clear();
    if (this.state.ODAnimate) {
      this.state.ODAnimate.stop()
      this.setState({ ODAnimate: "", points: [] })
    } else {
      // 线配置
      let src = "https://static-test.bimface.com/attach/3f9b4c5612194a71b0523766840351e6_流线贴图1028-6.png";
      let curve = await this.getSplineCurve(points, src, "curve");
      // 构造曲线动画的配置项(曲线对象、动画时间、动画循环、动画类型等参数)
      let config = new Glodon.Bimface.Plugins.Animation.CurveAnimationConfig();
      config.viewer = viewer;
      config.curves = [curve];
      config.time = 3000;
      config.loop = true;
      config.type = "flow";
      // 构造曲线动画对象
      let ODAnimate = new Glodon.Bimface.Plugins.Animation.CurveAnimation(config);
      ODAnimate.play();
      this.setState({ ODAnimate })
    }
  }

  //飞线图
  flyAnimate() {
    const { viewer, points, exMemberMng } = this.state;
    if (!points.length) return message.warning("请先添加节点！")
    exMemberMng.clear();
    if (this.state.flyAnimate) {
      this.state.flyAnimate.stop()
      this.setState({ flyAnimate: "", points: [] })
    } else {
      // 线配置
      let curveList = []
      let src = "https://static.bimface.com/attach/f4b5c5e71fce4090a63fc1c2e3839bd2_dynamic(1).png"
      let origin = { x: 313117.81672129536, y: 8842.8414994536, z: 14078.783957326568 }
      points.forEach((point, index) =>
        curveList.push(this.getSplineCurve([origin, point], src, `flyCurve${index + 1}`, true))
      )
      // 构造曲线动画的配置项(曲线对象、动画时间、动画循环、动画类型等参数)
      let config = new Glodon.Bimface.Plugins.Animation.CurveAnimationConfig();
      config.viewer = viewer;
      config.curves = curveList;
      config.time = 3000;
      config.loop = true;
      config.type = "flow";
      // 构造曲线动画对象
      let flyAnimate = new Glodon.Bimface.Plugins.Animation.CurveAnimation(config);
      flyAnimate.play();
      this.setState({ flyAnimate })
    }
  }

  wallAnimate(){
    const { viewer, points, exMemberMng } = this.state;
    if (!points.length) return message.warning("请先添加至少3个节点！")
    exMemberMng.clear();
    if (this.state.wallAnimate) {
      this.state.wallAnimate.stop()
      this.setState({ wallAnimate: "", points: [] })
    } else {
      // 构造电子围墙效果配置项
      let config = new Glodon.Bimface.Plugins.Animation.WallEffectConfig();
      points.push(points[0]);
      // 配置Viewer对象、方向、持续时间、路径、高度
      config.viewer = viewer;
      config.direction = {
        type: "Normal",  // 运动方式为沿着路径的切线方向
        reverse: false    // 运动方向默认为逆时针
      }
      config.duration = 3000;
      config.height = 80000;
      config.path = points;
      config.color = new Glodon.Web.Graphics.Color(50, 211, 166, 0.6);
      // 围墙动画
      let wallAnimate = new Glodon.Bimface.Plugins.Animation.WallEffect(config);
      console.log(wallAnimate)
      this.setState({wallAnimate})
    }
  }

  // 切换地图类型
  changeMap(type) {
    const { map } = this.state;
    switch (type) {
      case "amp":
        return map.setMapSource({ url: `https://webst01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=6&x={x}&y={y}&z={z}` })
      case "amapload":
        return map.setMapSource({ url: `https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}` })
      case "osmload":
        return map.setMapSource({ url: `https://c.tile.openstreetmap.org/{z}/{x}/{y}.png` })
      case "arcgis":
        return map.setMapSource({ url: `https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer/tile/{z}/{y}/{x}` })
    }
  }

  // 跳转bimface常规页
  toBase() {
    this.props.history.push({
      pathname: "/bimface",
      query: { from: "bimface" }
    })
  }

  render() {
    return (
      <div id="BimfaceGis" className={styles.BimfaceGis}>
        <div className={styles.factor}>
          {/* <TimePicker defaultValue={moment()} size="small" /> */}
          <Select defaultValue="amapload" onChange={this.changeMap.bind(this)}>
            <Option value="amp">高德影像</Option>
            <Option value="amapload">高德道路</Option>
            <Option value="osmload">OSM道路</Option>
            <Option value="arcgis">ArcGis道路</Option>
          </Select>
          <Button type="primary" size="small" onClick={_ => this.setState(prev => { return { drawerShow: !prev.drawerShow } })}>
            <MenuUnfoldOutlined />
          </Button>
          <Button type="dash" size="small" onClick={this.toBase.bind(this)} >
            <LoginOutlined />
          </Button>
        </div>
        <main id="domId" className={styles.container} />
        <aside className={styles.config}>
          <Drawer title="Bimface Config!"
            placement="right"
            closable={false}
            mask={false}
            getContainer={false}
            visible={this.state.drawerShow}
            style={{ position: 'absolute' }}
            onClose={_ => this.setState({ drawerShow: false })}
          >
            <Form>
              <Form.Item label="筛选">
                <Button type={this.state.isViewshed ? "primary" : "dash"} size="small" onClick={this.toggleViewShed.bind(this)}>
                  <span>可视域</span>
                  <EyeOutlined />
                </Button>
                <Button type={this.state.isLimitHeight ? "primary" : "dash"} size="small" onClick={this.LimitHeight.bind(this)}>
                  <span>控高</span>
                  <HomeOutlined />
                </Button>
              </Form.Item>
              <Form.Item label="扫描">
                <Button type="dash" size="small" onClick={this.scanEffect.bind(this, "ring")}>
                  <span>环形</span>
                  <FunnelPlotOutlined />
                </Button>
                <Button type="dash" size="small" onClick={this.scanEffect.bind(this, "fan")}>
                  <span>扇形</span>
                  <FunnelPlotOutlined />
                </Button>
              </Form.Item>
              <Form.Item label="OD线">
                <Button type="dash" size="small" onClick={this.startODPoints.bind(this)}>
                  <span>定点</span>
                  <AimOutlined />
                </Button>
                <Button type="dash" size="small" onClick={this.ODAnimate.bind(this)}>
                  <span>OD动画</span>
                  <CarOutlined />
                </Button>
                <Button type="dash" size="small" onClick={this.flyAnimate.bind(this)}>
                  <span>飞线图</span>
                  <CarOutlined />
                </Button>
                <Button type="dash" size="small" onClick={this.wallAnimate.bind(this)}>
                  <span>围墙</span>
                  <CarOutlined />
                </Button>
              </Form.Item>
            </Form>
          </Drawer>
        </aside>
      </div>
    )
  }
}