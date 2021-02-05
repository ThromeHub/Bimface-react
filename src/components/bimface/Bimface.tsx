import React from 'react';
import GlobalContext from '@src/common/global-context';
import styles from './bimface.module.less';
import { RootDispatch, RootState } from '@src/store';
import { connect } from '@store/connect';
import * as utils from "@src/utils";

//antd
import { Button, DatePicker, Drawer, Form, message, Space } from 'antd';
import {
  AimOutlined,
  BankOutlined,
  BgColorsOutlined,
  BorderBottomOutlined,
  BulbOutlined,
  CarOutlined,
  EditOutlined,
  EnvironmentOutlined,
  FormOutlined,
  HighlightOutlined,
  LockOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  RedoOutlined,
  RightOutlined,
  SendOutlined,
  SlidersOutlined,
  UndoOutlined,
  VideoCameraAddOutlined,
  VideoCameraOutlined,
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
export default class BimfaceMap extends React.Component<any> {
  static contextType = GlobalContext;
  constructor(props, context) {
    super(props, context);
    // bind  event-require
    this.addMemberPoint = this.addMemberPoint.bind(this);
    // state
    this.state = {
      isModal: true,                                      // 模型(rvt) / 图纸(dwg)
      drawerShow: true,                                   // 抽屉显示 
      annote: "",                                         // 批注
      annoteStatus: "",                                   // 批注状态
      annoteShow: false,                                  // 批注显示
      isolate: "",                                        // 解构
      isZoom: false,                                      // 是否定位
      isColor: false,                                     // 是否着色
      isColorLine: false,                                 // 是否着色轮廓
      isColorWindow: false,                               // 是否着色轮廓
      isLockDegree: false,                                // 是否锁角
      isBlink: false,                                     // 是否闪烁
      isRotate: false,                                    // 是否自动旋转
      isHover: false,                                     // 是否开启停留效果
      walkThrough: "",                                    // 漫游
      walkList: [],                                       // 漫游关键点列表
      drawContainer: "",                                  // 2D标签容器
      markerContainer: "",                                // 3D标签容器
      room: "",                                           // 房间
      roomId: "",                                         // 房间ID
      roomShow: true,                                     // 是否展示房间
      exMemberId: "",                                     // 外部构件Id
      exMemberMng: "",                                    // 外部构件容器
      TDSLoader: false,                                   // TDSLoader是否引入
      targetPosition: "",                                 // 选中构件坐标
      cameraStatus: "",                                   // 拍照相机参数
      points: [],                                         // 漫游定点
      pointsContainer: "",                                // 漫游定点标签容器
      pathAnimation: "",                                  // 漫游动画
      pausePathAnimation: false,                          // 漫游动画是否暂停
      app: "",                                            // 主组件
      viewer: "",                                         // 视图组件
      viewToken: "b8f2aba8446f47e08388c712df12b16e",      // 模型token 12小时
      // viewToken: "f98247cff86e4cf686b796d2ec1fe952",   // 图纸token 12小时
      construct: ["地坪", "F1", "F2", "F3", "ROOF"],      // 解构列表
      statusList: "",                                     // 状态列表
    }
  }

  componentDidMount() {
    this.initeBimface();
  }

  // 初始化
  initeBimface(viewToken = this.state.viewToken) {
    const { isModal } = this.state;
    // 根据viewToken指定待显示的模型或图纸
    let loaderConfig = new BimfaceSDKLoaderConfig();
    loaderConfig.viewToken = viewToken;
    // 加载BIMFACE JSSDK加载器
    BimfaceSDKLoader.load(loaderConfig, viewMetaData => {
      //创建 WebApplication3DConfig配置项
      let webAppConfig = isModal
        ? new Glodon.Bimface.Application.WebApplication3DConfig()
        : new Glodon.Bimface.Application.WebApplicationDrawingConfig()
      webAppConfig.domElement = document.getElementById('domId');
      //创建 WebApplication3D加载模型
      let app = isModal
        ? new Glodon.Bimface.Application.WebApplication3D(webAppConfig)
        : new Glodon.Bimface.Application.WebApplicationDrawing(webAppConfig)
      isModal ? app.addView(viewToken) : app.load(viewToken);
      //获取viewer3D对象
      let viewer = app.getViewer();
      //设置视角
      this.setState({ app, viewer }, () => {
        this.setEvent();
      })
    }, e => console.log("failure_load:", e));
  }

  // 设置视角
  setCamera(status) {
    let { viewer, cameraStatus } = this.state;
    if (status)
      viewer.setCameraStatus(status)
    else if (cameraStatus)
      viewer.setCameraStatus(cameraStatus)
    else
      viewer.setView(Glodon.Bimface.Viewer.ViewOption.Home);
    viewer.render();
  }
  // 保存视角
  getCamera() {
    let { viewer } = this.state;
    this.setState({ cameraStatus: viewer.getCameraStatus() })
  }

  // 设置事件
  setEvent() {
    let { viewer } = this.state;
    // 左键保存位置信息
    viewer.addEventListener("MouseClicked", (e) => {
      if (e.objectId)
        this.setState({ targetPosition: e.worldPosition })
    })
    // 右键获取解构信息
    viewer.addEventListener("ContextMenu", e => {
      if (e.objectId) {
        viewer.getComponentProperty([e.objectId], data => console.log("构件属性：", data))
        viewer.getFloors(data => console.log("楼层信息：", data))
        viewer.getNearestAxisGrids(e.worldPosition, "", data => console.log(`${data[0].name}-${data[1].name}`))
        viewer.clearSelectedComponents();// 取消选中状态
      } else {
        viewer.getModelTree(data => console.log("目录信息：", data))
        viewer.getNestedComponents(data => console.log("嵌套关系：", data))
      }
    })
  }


  /*
   * 2D标签 
  */
  // 创建2D标签容器
  createDrawContainer() {
    const { viewer } = this.state;
    // 创建二维标签容器配置
    let config = new Glodon.Bimface.Plugins.Drawable.DrawableContainerConfig();
    config.viewer = viewer;
    // 创建二维标签容器
    this.setState({ drawContainer: new Glodon.Bimface.Plugins.Drawable.DrawableContainer(config) })
  }
  // 设置标签
  async addDraw() {
    // 初始化
    if (!this.state.drawContainer) await this.createDrawContainer();
    const { viewer, drawContainer } = this.state;
    // 清除
    if (drawContainer.getAllItems().length) return drawContainer.clear();
    // 配置
    let config = new Glodon.Bimface.Plugins.Drawable.CustomItemConfig();
    let content = document.createElement('div');
    content.style.width = '80px';
    content.style.height = '32px';
    content.style.border = 'solid';
    content.style.borderColor = '#FFFFFF';
    content.style.borderWidth = '2px';
    content.style.borderRadius = '5%';
    content.style.background = '#11DAB7';
    content.innerText = 'Here';
    content.style.color = '#FFFFFF';
    content.style.textAlign = 'center';
    content.style.lineHeight = '32px';
    config.content = content;
    config.viewer = viewer;
    config.worldPosition = {
      "x": Math.ceil(-5743.838548165086 * Math.random() * 2),
      "y": Math.ceil(-3667.12605781937 * Math.random() * 2),
      "z": Math.ceil(12923.137945446013 * Math.random() * 2)
    };
    //将自定义添加至标签容器
    let draw = new Glodon.Bimface.Plugins.Drawable.CustomItem(config);
    draw.onClick(e => {
      console.log(e.worldPosition)
    })
    drawContainer.addItem(draw);
  }
  //移动标签
  moveTipe(type: String) {
    let container = this.state[type]
    let list = container.getAllItems();
    if (!list.length) return message.warning("请先添加2D标签！")
    list.forEach(item => {
      // console.log(item)
      let { x, y, z } = item.worldPosition ? item.worldPosition : item.originalPosition;
      item.setWorldPosition({ x: Math.ceil(x * .9), y: Math.ceil(y * .9), z: Math.ceil(z * .9) })
    })
    container.update();
  }

  /*
  * 3D标签
  */
  // 创建3D标签容器
  createMarkerContainer() {
    let { viewer } = this.state;
    // 构造三维标签容器配置
    let config = new Glodon.Bimface.Plugins.Marker3D.Marker3DContainerConfig();
    config.viewer = viewer;
    // 构造三维标签容器
    this.setState({ markerContainer: new Glodon.Bimface.Plugins.Marker3D.Marker3DContainer(config) })
  }
  // 添加3D标签
  async addMark() {
    // 初始化
    if (!this.state.markerContainer) await this.createMarkerContainer();
    let { markerContainer } = this.state;
    // 清除
    if (markerContainer.getAllItems().length) return markerContainer.clear()
    // 配置
    let config = new Glodon.Bimface.Plugins.Marker3D.Marker3DConfig();
    config.src = "http://static.bimface.com/resources/3DMarker/warner/warner_red.png";
    config.worldPosition = {
      "x": Math.ceil(-5743.838548165086 * Math.random() * 2),
      "y": Math.ceil(-3667.12605781937 * Math.random() * 2),
      "z": Math.ceil(12923.137945446013 * Math.random() * 2)
    };
    config.size = 80;
    // 构建三维标签
    let marker = new Glodon.Bimface.Plugins.Marker3D.Marker3D(config);
    marker.onClick(e => {
      console.log(e.worldPosition)
    })
    markerContainer.addItem(marker)
  }


  // 解构
  isolate(levelName: String) {
    const { viewer } = this.state;
    // 重置判断
    if (this.state.isolate == levelName) {
      this.setState({ isolate: "" })
      viewer.clearIsolation();
      viewer.render();
      return
    }
    // 设置隔离选项，指定其他构件为半透明状态
    let makeOthersTranslucent = Glodon.Bimface.Viewer.IsolateOption.MakeOthersTranslucent;
    // 调用viewer3D.method，隔离楼层为"F2"的构件
    viewer.isolateComponentsByObjectData([{ levelName }], makeOthersTranslucent);
    // 更新
    viewer.render();
    this.setState({ isolate: levelName })
  }

  // 定位
  zoomTo() {
    const { viewer } = this.state;
    if (this.state.isZoom) {
      this.setState({ isZoom: false })
      viewer.setView(Glodon.Bimface.Viewer.ViewOption.Home);
      return
    }
    viewer.addSelectedComponentsById(['271431']); // 构建Id
    viewer.zoomToSelectedComponents();
    viewer.clearSelectedComponents();
    this.setState({ isZoom: true })
  }

  // 着色
  colorTo() {
    const { viewer, isColor } = this.state;
    if (isColor) {
      viewer.clearOverrideColorComponents();
      viewer.render();
      this.setState({ isColor: false })
      return
    }
    let color = new Glodon.Web.Graphics.Color("#9BB9BB", .6);  //必须6位
    viewer.overrideComponentsColorById(["389601"], color);
    viewer.render();
    this.setState({ isColor: true })
  }
  // 轮廓着色
  colorLine() {
    const color = new Glodon.Web.Graphics.Color(99, 188, 168, .8)
    const { viewer, isColorLine } = this.state;
    isColorLine
      ? viewer.restoreWireframeColor()
      : viewer.setWireframeColor(color);
    // 特定
    // let ids =  ["267327", "268067", "271431", "272632", "276388"]
    // isColorLine
    //   ? viewer.restoreComponentsFrameColorById(ids)
    //   : viewer.overrideComponentsFrameColorById(ids,color)
    viewer.render();
    this.setState(prev => { return { isColorLine: !prev.isColorLine } })
  }
  // 窗户着色
  colorWindow() {
    const { viewer, isColorWindow } = this.state;
    const color = new Glodon.Web.Graphics.Color(0, 255, 0, 1);
    const frames = [
      { family: "window 3" },
      { family: "双扇推拉门5" },
      { family: "四扇推拉门 2" },
      { family: "固定" },
    ];
    isColorWindow
      ? viewer.restoreComponentsFrameColorByObjectData(frames)
      : viewer.overrideComponentsFrameColorByObjectData(frames, color);
    viewer.render();
    this.setState(prev => { return { isColorWindow: !prev.isColorWindow } })
  }

  // 锁角
  lockDegree() {
    let { viewer, isLockDegree } = this.state;
    if (isLockDegree)
      viewer.unlockAxis(Glodon.Bimface.Viewer.AxisOption.Z);
    else
      viewer.lockAxis(Glodon.Bimface.Viewer.AxisOption.Z, [Math.PI / 12, Math.PI / 2]);
    this.setState(prev => { return { isLockDegree: !prev.isLockDegree } })
  }

  // 闪烁
  blink() {
    const { viewer } = this.state;
    if (this.state.isBlink) {
      viewer.clearAllBlinkComponents();
      viewer.render();
      this.setState({ isBlink: false })
      return
    }
    let color = new Glodon.Web.Graphics.Color("#9BB9BB", .6);
    viewer.enableBlinkComponents(true)  // 开启构件强调开关
    viewer.addBlinkComponentsById(["389617"])
    viewer.setBlinkColor(color)
    viewer.setBlinkIntervalTime(500)
    viewer.render();
    this.setState({ isBlink: true })
  }

  // 存写状态
  statusTo(type: String) {
    const { viewer } = this.state;
    switch (type) {
      case "save":
        let status = viewer.getCurrentState();
        this.setState({ status })
        break
      case "load":
        if (this.state.status) {
          viewer.setState(this.state.status);
          viewer.render();
        }
        break
    }
  }

  // 自动旋转
  autoRotate(step: Number) {
    const { viewer, targetPosition } = this.state;
    if (this.state.isRotate) {
      viewer.stopAutoRotate();
      viewer.render();
      this.setState({ isRotate: false, targetPosition: "" })
      return
    }
    targetPosition
      ? viewer.startAutoRotate(step, targetPosition)
      : viewer.startAutoRotate(step)
    this.setState({ isRotate: true })
  }


  /*
  * 漫游相关
  */
  // 创建漫游
  createWalkThrough() {
    let { viewer } = this.state;
    let walkThroughConfig = new Glodon.Bimface.Plugins.Walkthrough.WalkthroughConfig();
    walkThroughConfig.viewer = viewer;
    let walkThrough = new Glodon.Bimface.Plugins.Walkthrough.Walkthrough(walkThroughConfig);
    this.setState({ walkThrough })
  }
  // 添加漫游关键帧
  async addWalkThrough() {
    if (!this.state.walkThrough) await this.createWalkThrough();
    let { walkThrough } = this.state;
    walkThrough.addKeyFrame();
    let walkList = walkThrough.getKeyFrames();
    this.setState({ walkThrough, walkList })
  }
  // 漫游开始
  playWalkThrough() {
    let { walkThrough } = this.state;
    if (!walkThrough)
      return message.warning("请先添加关键帧！")
    walkThrough.setWalkthroughTime(6);
    walkThrough.setKeyFrameCallback(this.listenWalkThrough)
    walkThrough.stopCallback(this.stopWalkThrough)
    walkThrough.play();
  }
  // 漫游监听
  listenWalkThrough(index) {
    console.log(`--第${index}关键帧--`)
  }
  // 漫游结束
  stopWalkThrough() {
    console.log(`漫游结束！`)
  }


  /*
  * 批注相关
  */
  // 创建批注工具条
  createAnnote() {
    let { viewer } = this.state;
    // 创建批注工具条的配置
    let config = new Glodon.Bimface.Plugins.Annotation.AnnotationToolbarConfig();
    config.viewer = viewer;
    // 创建批注工具条
    let annote = new Glodon.Bimface.Plugins.Annotation.AnnotationToolbar(config);
    annote.addEventListener("Saved", this.saveAnnote.bind(this))
    annote.addEventListener("Cancelled", this.exitAnnote.bind(this))
    this.setState({ annote })
  }
  saveAnnote() {  // 保存并退出
    let { annote } = this.state;
    let annoteStatus = annote.getAnnotationManager().getCurrentState();
    this.setState({ annoteStatus })
  }
  exitAnnote() {  // 退出
    let { app, annote } = this.state;
    app.getToolbar("MainToolbar").show();
    annote.getAnnotationManager().exit();
    this.setState({ annoteShow: false })
  }
  // 开始批注
  async startAnnote() {
    await this.createAnnote();
    let { app, annote, annoteShow } = this.state;
    if (annoteShow) return
    app.getToolbar("MainToolbar").hide(); // 隐藏工具条
    annote.show();
    this.setState({ annoteShow: true, drawerShow: false })
  }
  // 恢复批注
  resetAnnote() {
    const { annote, annoteStatus } = this.state;
    if (!annoteStatus) return message.warning("暂未存储批注状态！")
    annote.getAnnotationManager().setState(annoteStatus);
  }


  /*
  * 房间相关
  */
  createRoom(name: String) {
    let { viewer } = this.state, room;
    viewer.getAreas(data => {
      for (let i = 0; i < data.length; i++)
        if (data[i].rooms) {
          room = data[i].rooms.find(room => room.name == name)
          if (room) break
        }
      console.log("room", room)
      let roomId = room.id;
      viewer.createRoom(room.boundary, 3350, roomId);
      viewer.render();
      this.setState({ room, roomId })
    })
  }
  // 房间上色
  colorupRoom() {
    let { roomId, viewer } = this.state;
    viewer.setRoomsColorById([roomId], new Glodon.Web.Graphics.Color(66, 255, 33, 0.1))
    viewer.render();
  }
  // 房间显隐
  toggleRoom() {
    let { roomId, viewer, roomShow } = this.state;
    if (roomShow)
      viewer.hideRoomsById([roomId])
    else
      viewer.showRoomsById([roomId])
    viewer.render();
    this.setState(prev => { return { roomShow: !prev.roomShow } })
  }


  /*
  * 外部构建
  */
  // 加载构件控件
  initeMember() {
    let url = "http://static.bimface.com/attach/6db9d5bcf88640f997b23be61e870ee8_%E6%B1%BD%E8%BD%A6.3DS"
    let TDSLoaderUrl = "http://static.bimface.com/attach/341bb8bde7bf4a5898ecdf58c2a476fb_TDSLoader.js";
    //已加载TDSLoader
    if (this.state.TDSLoader) {
      // 切换外部构件
      if (this.state.exMemberId) {
        this.state.exMemberMng.removeById(this.state.exMemberId);
        console.log(this.state.pathAnimation)
        this.setState({ exMemberId: "" })
      } else this.loadMember(url, "vehicle")
    } else {  // 加载TDSLoader
      utils.loadScript(TDSLoaderUrl, () => this.loadMember(url, "vehicle"))
      this.setState({ TDSLoader: true })
    }
  }
  // 添加构件
  loadMember(url: String, name: String) {
    let exMemberMng, exMemberId;
    let { viewer, spline } = this.state;
    // 构造3DS加载器
    let loader = new THREE.TDSLoader;
    if (spline) this.setState({ spline: "" })
    loader.load(url, member => {
      // 添加为外部构件
      exMemberMng = new Glodon.Bimface.Viewer.ExternalObjectManager(viewer);
      exMemberMng.addObject(name, member);
      // 获取Id
      exMemberId = exMemberMng.getObjectIdByName(name);
      // 放置
      exMemberMng.translate(exMemberId, { x: -7500, y: -15000, z: -450 })
      viewer.render();
      this.setState({
        exMemberMng,
        exMemberId,
        pathAnimation: "",
        pausePathAnimation: false,
        points: [],
        spline: ""
      })
    })
  }
  // 开始漫游埋点
  async startMemberPoints() {
    const { viewer, pathAnimation, exMemberMng, exMemberId } = this.state;
    if (pathAnimation) {
      pathAnimation.stop();
      await this.setState({ pathAnimation: "", points: [], spline: "" })
    }
    this.drawMemberPoint(exMemberMng.getPosition([exMemberId]))
    viewer.addEventListener("MouseClicked", this.addMemberPoint)
  }
  // 增加漫游埋点
  addMemberPoint(e) {
    const { viewer } = this.state;
    viewer.clearSelectedComponents();
    if (e.worldPosition) {
      this.drawMemberPoint(e.worldPosition)
    } else message.warning("请在模型范围内取点！")
  }
  // 标记漫游埋点
  drawMemberPoint(point: Object) {
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
    circle.style.borderColor = '#FFFFFF';
    circle.style.borderWidth = '1px';
    circle.style.background = '#FFFF00';
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
  // 漫游构件
  walkMember() {
    const { exMemberId, points, pausePathAnimation } = this.state;
    if (!exMemberId)
      return message.warning("请先添加外部构件！")
    if (points.length < 2)
      return message.warning("请先添加漫游节点！")
    if (this.state.pathAnimation) {
      pausePathAnimation
        ? this.state.pathAnimation.play()
        : this.state.pathAnimation.pause()
      this.setState(prev => { return { pausePathAnimation: !prev.pausePathAnimation } })
      return
    }
    let { exMemberMng, viewer } = this.state;
    // 动画
    let curve = this.getSplineCurve();
    let config = new Glodon.Bimface.Plugins.Animation.PathAnimationConfig();
    config.viewer = viewer;
    config.path = curve;
    config.time = 3000;
    config.loop = true;
    config.objectNames = [exMemberMng.getObjectIdByName("vehicle")];
    config.isPitchEnabled = true;
    config.isYawEnabled = true;
    config.originYaw = 0.5 * Math.PI;
    let pathAnimation = new Glodon.Bimface.Plugins.Animation.PathAnimation(config);
    pathAnimation.play();
    this.setState({ pathAnimation })
  }
  // 获取漫游路径曲线
  getSplineCurve() {
    // return new THREE.CatmullRomCurve3([new THREE.Vector3(-7500, -15000, -450)])
    const { points, viewer, pointsContainer } = this.state;
    // 清除埋点
    viewer.removeEventListener("MouseClicked", this.getPoint)
    viewer.render();
    pointsContainer.clear();
    // 绘制曲线
    let spline = new Glodon.Bimface.Plugins.Geometry.SplineCurve(points);
    this.setState({ spline })
    return spline
  }
  // 旋转构件
  rotateMember(angle: Number) {
    const { exMemberId, exMemberMng, pathAnimation, pausePathAnimation } = this.state;
    if (!this.state.exMemberId) return message.warning("请先添加外部构件！")
    if (pathAnimation && !pausePathAnimation) return
    exMemberMng.rotateZ(exMemberId, angle)
  }
  // 旋转构件
  goMember(step: Number) {
    const { exMemberId, exMemberMng, pathAnimation, pausePathAnimation } = this.state;
    if (!exMemberId) return message.warning("请先添加外部构件！")
    if (pathAnimation && !pausePathAnimation) return
    exMemberMng.offsetY(exMemberId, step)
  }
  // 编辑构件
  editMember() {
    const { exMemberId, viewer, pathAnimation, pausePathAnimation } = this.state;
    if (!exMemberId) return message.warning("请先添加外部构件！")
    if (pathAnimation && !pausePathAnimation) return
    // 外部构件编辑器配置
    let config = new Glodon.Bimface.Plugins.ExternalObject.ExternalObjectEditorToolbarConfig();
    config.viewer = viewer;
    config.id = exMemberId;
    let editor = new Glodon.Bimface.Plugins.ExternalObject.ExternalObjectEditorToolbar(config);
    editor.show();
  }


  /*
  * 状态相关
  */
  // 获取状态列表
  getStatusList(index) {
    const { viewer } = this.state;
    viewer.get3DViewStates(data => {
      console.log(data)
      viewer.setState(data.views[index].state);
      viewer.render();
      this.setState({ statusList: data.views })
    })
  }
  // 切换状态
  toggleStatus(index) {
    const { viewer, statusList } = this.state;
    if (!statusList) return this.getStatusList(index)
    viewer.setState(statusList[index].state);
    viewer.render();
  }

  // 隐藏默认UI
  hoverUI() {
    let { viewer, isHover } = this.state;
    isHover
      ? viewer.disableMouseHoverHighlight()
      : viewer.enableMouseHoverHighlight()
    this.setState(prev => { return { isHover: !prev.isHover } })
  }

  // 跳转Gis页
  toGis() {
    this.props.history.push({
      pathname: "/bimfaceGis",
      query: { from: "Bimface" }
    })
  }

  render() {
    return (
      <div id="Bimface" className={styles.Bimface}>
        {/* 展示项 */}
        <div className={styles.factor}>
          <DatePicker size="small" />
          <Button type="primary" size="small" onClick={_ => this.setState(prev => { return { drawerShow: !prev.drawerShow } })}>
            <MenuUnfoldOutlined />
          </Button>
          <Button type="dash" size="small" onClick={this.hoverUI.bind(this)}>
            <BorderBottomOutlined />
          </Button>
          <Button type="dash" size="small" onClick={this.toGis.bind(this)}>
            <LogoutOutlined />
          </Button>
        </div>
        {/* 主图 */}
        <main id="domId" className={styles.container}></main>
        {/* 配置项 */}
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
            <Form initialValues={{ remember: true }}>
              {/* 结构 */}
              <Form.Item label="解构">
                {this.state.construct.map((item, index) => {
                  return (
                    <Button type="dash" size="small" key={index} onClick={this.isolate.bind(this, item)}>
                      <span>{item}</span>
                      <BankOutlined />
                    </Button>
                  )
                })}
              </Form.Item>
              {/* 定位 */}
              <Form.Item label="定位">
                <Button type={this.state.isZoom ? "primary" : "dash"} size="small" onClick={this.zoomTo.bind(this)}>
                  <span>F1窗体</span>
                  <EnvironmentOutlined />
                </Button>
                <Button type={this.state.cameraStatus ? "primary" : "dash"} size="small" onClick={this.getCamera.bind(this)}>
                  <span>拍照</span>
                  <VideoCameraAddOutlined />
                </Button>
                <Button type="dash" size="small" onClick={this.setCamera.bind(this, '')}>
                  <span>回档</span>
                  <VideoCameraOutlined />
                </Button>
              </Form.Item>
              {/* 着色 */}
              <Form.Item label="着色">
                <Button type={this.state.isColor ? "primary" : "dash"} size="small" onClick={this.colorTo.bind(this)}>
                  <span>F1墙体</span>
                  <BgColorsOutlined />
                </Button>
                <Button type={this.state.isColorLine ? "primary" : "dash"} size="small" onClick={this.colorLine.bind(this)}>
                  <span>轮廓</span>
                  <BgColorsOutlined />
                </Button>
                <Button type={this.state.isColorWindow ? "primary" : "dash"} size="small" onClick={this.colorWindow.bind(this)}>
                  <span>窗体</span>
                  <BgColorsOutlined />
                </Button>
              </Form.Item>
              {/* 锁角 */}
              <Form.Item label="角度">
                <Button type={this.state.isLockDegree ? "primary" : "dash"} size="small" onClick={this.lockDegree.bind(this)}>
                  <span>锁定</span>
                  <LockOutlined />
                </Button>
              </Form.Item>
              {/* 闪烁 */}
              <Form.Item label="闪烁">
                <Button type={this.state.isBlink ? "primary" : "dash"} size="small" onClick={this.blink.bind(this)}>
                  <span>F1窗体</span>
                  <BulbOutlined />
                </Button>
              </Form.Item>
              {/* 自动旋转 */}
              <Form.Item label="自动旋转">
                <Button type="dash" size="small" onClick={this.autoRotate.bind(this, 2)}>
                  <span>顺时针</span>
                  <RedoOutlined />
                </Button>
                <Button type="dash" size="small" onClick={this.autoRotate.bind(this, -2)}>
                  <span>逆时针</span>
                  <UndoOutlined />
                </Button>
              </Form.Item>
              {/* 状态 */}
              <Form.Item label="状态">
                <Button type="dash" size="small" onClick={this.statusTo.bind(this, "save")}>
                  <span>保存</span>
                  <FormOutlined />
                </Button>
                <Button type="dash" size="small" onClick={this.statusTo.bind(this, "load")}>
                  <span>读取</span>
                  <PlayCircleOutlined />
                </Button>
              </Form.Item>
              {/* 关键帧 */}
              <Form.Item label="关键帧">
                <Button type="dash" size="small" onClick={this.addWalkThrough.bind(this)}>
                  <span>添加</span>
                  <PlusOutlined />
                </Button>
                <Button type="dash" size="small" onClick={this.playWalkThrough.bind(this)}>
                  <span>漫游:{this.state.walkList.length}</span>
                  <SendOutlined />
                </Button>
              </Form.Item>
              {/* 工具条 */}
              <Form.Item label="工具条">
                <Button type="dash" size="small" onClick={this.startAnnote.bind(this)}>
                  <span>绘制</span>
                  <HighlightOutlined />
                </Button>
                <Button type="dash" size="small" onClick={this.resetAnnote.bind(this)}>
                  <span>恢复</span>
                  <RedoOutlined />
                </Button>
              </Form.Item>
              {/* 标签 */}
              <Form.Item label="标签">
                <Button type="dash" size="small" onClick={this.addDraw.bind(this)}>
                  <span>2D增加</span>
                  <PlusOutlined />
                </Button>
                <Button type="dash" size="small" onClick={this.moveTipe.bind(this, "drawContainer")}>
                  <span>2D移动</span>
                  <SendOutlined />
                </Button>
                <br />
                <Button type="dash" size="small" onClick={this.addMark.bind(this)}>
                  <span>3D增加</span>
                  <PlusOutlined />
                </Button>
                <Button type="dash" size="small" onClick={this.moveTipe.bind(this, "markerContainer")}>
                  <span>3D移动</span>
                  <SendOutlined />
                </Button>
              </Form.Item>
              {/* 房间 */}
              <Form.Item label="房间">
                <Button type="dash" size="small" onClick={this.createRoom.bind(this, "活动室 11")}>
                  <span>增加</span>
                  <PlusOutlined />
                </Button>
                <Button type="dash" size="small" onClick={this.colorupRoom.bind(this)}>
                  <span>着色</span>
                  <HighlightOutlined />
                </Button>
                <Button type="dash" size="small" onClick={this.toggleRoom.bind(this)}>
                  <span>显隐</span>
                  <RedoOutlined />
                </Button>
              </Form.Item>
              {/* 外部构件 */}
              <Form.Item label="构件">
                <Button type="dash" size="small" onClick={this.initeMember.bind(this)}>
                  <span>增加</span>
                  <PlusOutlined />
                </Button>
                <Button type="dash" size="small" onClick={this.startMemberPoints.bind(this)}>
                  <span>定点</span>
                  <AimOutlined />
                </Button>
                <Button type="dash" size="small" onClick={this.walkMember.bind(this)}>
                  <span>漫游</span>
                  <CarOutlined />
                </Button>
                <Button type="dash" size="small" onClick={this.rotateMember.bind(this, Math.PI / 6)}>
                  <span>旋转</span>
                  <RedoOutlined />
                </Button>
                <Button type="dash" size="small" onClick={this.goMember.bind(this, -2000)}>
                  <span>前进</span>
                  <RightOutlined />
                </Button>
                <Button type="dash" size="small" onClick={this.editMember.bind(this)}>
                  <span>编辑</span>
                  <EditOutlined />
                </Button>
              </Form.Item>
              <Form.Item label="状态">
                <Button type="dash" size="small" onClick={this.toggleStatus.bind(this, 0)}>
                  <span>标准</span>
                  <SlidersOutlined />
                </Button>
                <Button type="dash" size="small" onClick={this.toggleStatus.bind(this, 1)}>
                  <span>骨架</span>
                  <SlidersOutlined />
                </Button>
                <Button type="dash" size="small" onClick={this.toggleStatus.bind(this, 2)}>
                  <span>粉嫩</span>
                  <SlidersOutlined />
                </Button>
              </Form.Item>
            </Form>
          </Drawer>
        </aside>
      </div>
    )
  }
}