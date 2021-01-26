import React from 'react';
import GlobalContext from '@src/common/global-context';
import styles from './bimface.module.less';
import { RootDispatch, RootState } from '@src/store';
import { connect } from '@store/connect';
// import * as utils from "@src/utils";

//antd
import { Button, DatePicker, Drawer, Form, message, Space } from 'antd';
import {
  BankOutlined,
  BgColorsOutlined,
  BulbOutlined,
  EnvironmentOutlined,
  FormOutlined,
  HighlightOutlined, 
  MenuUnfoldOutlined,
  OrderedListOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  RedoOutlined,
  SendOutlined,
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
    this.state = {
      isModal: true,      // 模型(rvt) / 图纸(dwg)
      drawerShow: false,  // 抽屉显示 
      annote: "",          // 批注
      annoteStatus: "",   // 批注状态
      annoteShow: false,  // 批注显示
      isolate: "",        // 解构
      iszoom: false,      // 是否定位
      isColor: false,     // 是否着色
      isBlink: false,     // 是否闪烁
      isRotate: false,    // 是否自动旋转
      walkThrough: "",    // 漫游
      walkList: [],       // 漫游关键点列表
      app: "",            // 主组件
      viewer: "",         // 视图组件
      viewToken: "676eb50fc6e34fe9b243e1732f57e9d3",    // 模型token 12小时
      // viewToken: "f98247cff86e4cf686b796d2ec1fe952", // 图纸token 12小时
      // viewToken: "fbe21adbb9e249289a1d5e35e3538b92", // 示例token 永久
      construct: ["地坪", "F1", "F2", "F3", "ROOF"],  //解构列表
    }
  }

  componentDidMount() {
    this.initeBimface();
  }

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
      this.setState({
        app, viewer
      })
    }, e => console.log("failure_load:", e));
  }

  getMenuList(){
    let {viewer} = this.state;
    console.log("viewer",viewer)
  }

  // 解构
  isolate(levelName) {
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
    const { viewer } = this.state;
    if (this.state.isColor) {
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
  statusTo(type) {
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

  // 旋转
  autoRotate(step) {
    const { viewer } = this.state;
    if (this.state.isRotate) {
      viewer.stopAutoRotate();
      viewer.render();
      this.setState({ isRotate: false })
      return
    }
    viewer.startAutoRotate(step);
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
    walkThrough.play();
  }
  // 漫游监听
  listenWalkThrough(index) {
    console.log(`--第${index}关键帧--`)
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


  render() {
    return (
      <div id="Bimface" className={styles.Bimface}>
        {/* 展示项 */}
        <div className={styles.factor}>
          <DatePicker size="small" />
          <Button size="small" onClick={this.getMenuList.bind(this)}>
            <OrderedListOutlined />
          </Button>
          <Button type="primary"
            size="small"
            onClick={_ => this.setState(prev => { return { drawerShow: !prev.drawerShow } })}>
            <MenuUnfoldOutlined />
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
                <Button type="dash" size="small" onClick={this.zoomTo.bind(this)}>
                  <span>F1窗体</span>
                  <EnvironmentOutlined />
                </Button>
              </Form.Item>
              {/* 着色 */}
              <Form.Item label="着色">
                <Button type="dash" size="small" onClick={this.colorTo.bind(this)}>
                  <span>F1墙体</span>
                  <BgColorsOutlined />
                </Button>
              </Form.Item>
              {/* 闪烁 */}
              <Form.Item label="闪烁">
                <Button type="dash" size="small" onClick={this.blink.bind(this)}>
                  <span>F1窗体</span>
                  <BulbOutlined />
                </Button>
              </Form.Item>
              {/* 自动旋转 */}
              <Form.Item label="自动旋转">
                <Button type="dash" size="small" onClick={this.autoRotate.bind(this, "5")}>
                  <span>顺时针</span>
                  <BgColorsOutlined />
                </Button>
                <Button type="dash" size="small" onClick={this.autoRotate.bind(this, "-5")}>
                  <span>逆时针</span>
                  <BgColorsOutlined />
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
            </Form>
          </Drawer>
        </aside>
      </div>
    )
  }
}