import React, { PureComponent } from 'react';
import ScrollableTabView, {
  DefaultTabBar,
} from 'react-native-scrollable-tab-view';
import { View, Animated } from 'react-native';

class HeaderContainer extends PureComponent {
  state = {
    headerLayoutHeight: 0,
    stickBarLayoutHeight: 0,
  };
  handleHeaderLayout = ({ nativeEvent }) => {
    const { stickBarLayoutHeight } = this.state;
    const height = nativeEvent.layout.height;
    this.setState({
      headerLayoutHeight: height,
    });
    this.props.onLayoutChange({ height, stickBarHeight: stickBarLayoutHeight });
  };

  handleStickBarLayout = ({ nativeEvent }) => {
    const { headerLayoutHeight } = this.state;
    const stickBarHeight = nativeEvent.layout.height;
    this.setState({
      stickBarLayoutHeight: stickBarHeight,
    });
    this.props.onLayoutChange({ height: headerLayoutHeight, stickBarHeight });
  };
  render() {
    const { headerLayoutHeight, stickBarLayoutHeight } = this.state;
    const { scrollOffsetAnimatedValue, children } = this.props;
    const { handleHeaderLayout, handleStickBarLayout } = this;
    const maxScrollOutOfBoundAnimatedOffset = 999;
    const foldableHeaderOffset = Math.max(
      headerLayoutHeight - stickBarLayoutHeight,
      0
    );
    console.log(
      'foldableHeaderOffset',
      foldableHeaderOffset,
      headerLayoutHeight,
      stickBarLayoutHeight
    );
    const translateY = scrollOffsetAnimatedValue.interpolate({
      inputRange: [-maxScrollOutOfBoundAnimatedOffset, foldableHeaderOffset],
      outputRange: [maxScrollOutOfBoundAnimatedOffset, -foldableHeaderOffset],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            zIndex: 1,
            transform: [{ translateY }],
          },
        ]}
        onLayout={handleHeaderLayout}
      >
        {children.slice(0, children.length - 1)}
        <View onLayout={handleStickBarLayout}>
          {children[children.length - 1]}
        </View>
      </Animated.View>
    );
  }
}

const makeSceneKey = (child, index) =>
  `${child.props.tabLabel || 'unknown'}-${index}`;
const calcAlterScrollOffset = (
  headerOffset,
  foldableHeaderOffset,
  cachedScrollOffset
) => {
  // const headerOffset = calcHeaderOffset(offset, foldableHeaderOffset)
  const cachedHeaderOffset = calcHeaderOffset(
    cachedScrollOffset,
    foldableHeaderOffset
  );

  return headerOffset < foldableHeaderOffset
    ? headerOffset
    : Math.max(cachedScrollOffset + (headerOffset - cachedHeaderOffset), 0);
};

const calcHeaderOffset = (scrollOffset = 0, foldableHeaderOffset) => {
  return Math.min(scrollOffset, foldableHeaderOffset);
};

class StickableTabView extends PureComponent {
  cacheWithDeps = {};
  _memo = (key, fn, deps) => {
    const cachedDeps = this.cacheWithDeps[key];
    if (cachedDeps) {
      const currentDeps = cachedDeps.deps;
      const currenVal = cachedDeps.value;
      const isUseCache = deps.every((dp, index) => {
        return Object.is(dp, currentDeps[index]);
      });
      if (isUseCache) {
        return currenVal;
      }
    }
    const c = {
      value: fn(),
      deps,
    };
    this.cacheWithDeps[key] = c;
    return c.value;
  };
  // header's height and stickBar's height is dymanic
  state = {
    headerHeight: 0,
    stickBarHeight: 0,
  };
  // sync header offset for diff scene via scrollTop
  scrollNodes = {};
  _getScrollNode = sceneKey => {
    return this.scrollNodes[sceneKey] || null;
  };
  _setScrollNode = (sceneKey, node) => {
    this.scrollNodes[sceneKey] = node;
  };
  alterScrollOffsetMap = {};
  _getAlterScrollOffset = sceneKey => {
    return this.alterScrollOffsetMap[sceneKey];
  };
  _setAlterScrollOffset = (sceneKey, offset) => {
    this.alterScrollOffsetMap[sceneKey] = offset;
  };

  _getFoldableHeaderOffset = () => {
    // header's max offset
    const { headerHeight, stickBarHeight } = this.state;
    const foldableHeaderOffset = Math.max(headerHeight - stickBarHeight, 0);
    return foldableHeaderOffset;
  };

  cachedScrollOffsetMap = {};
  _getCachedScrollOffset = sceneKey => {
    return this.cachedScrollOffsetMap[sceneKey] || 0;
  };
  _setCachedScrollOffset = (sceneKey, offset) => {
    this.cachedScrollOffsetMap[sceneKey] = offset;
  };

  headerOffset = 0;
  _getHeaderOffset = () => {
    return this.headerOffset;
  };
  _setHeaderOffset = offset => {
    this.headerOffset = offset;
  };

  scrollOffsetAnimatedValue = new Animated.Value(0);
  activeSceneKey = null;
  _getActiveSceneKey = () => {
    return this.activeSceneKey;
  };
  _setActiveSceneKey = sceneKey => {
    this.activeSceneKey = sceneKey;
  };

  defaultSceneKey = makeSceneKey(
    this.props.children[this.props.initialPage],
    this.props.initialPage
  );
  visitedSceneKeys = {};
  isVisited = sceneKey => {
    return this.visitedSceneKeys[sceneKey] !== undefined;
  };
  addVisitedSceneKey = sceneKey => {
    this.visitedSceneKeys[sceneKey] = true;
  };

  // 考虑性能
  _partRenderableChildrenType = children => {
    const { _memo, _setChildrenNodeRerender } = this;
    return (children || []).map((child, index) => {
      const sceneKey = makeSceneKey(child, index);
      const currentNodeType = child.type;
      const [PartRenderType, rerender] = _memo(
        `${sceneKey}@_genPartRenderableChildren`,
        () => {
          const AnimatedVirtualizedList = Animated[currentNodeType.name];
          return withDirect(AnimatedVirtualizedList);
        },
        [currentNodeType]
      );

      _setChildrenNodeRerender(sceneKey, () => {
        const {
          _getHeaderOffset,
          _getFoldableHeaderOffset,
          _getCachedScrollOffset,
        } = this;
        const y = calcAlterScrollOffset(
          _getHeaderOffset(),
          _getFoldableHeaderOffset(),
          _getCachedScrollOffset(sceneKey)
        );
        rerender({
          contentOffset: { y },
        });
      });
      return PartRenderType;
    });
  };

  childrenNodeTypeMap = {};
  _getChildrenNodeType = sceneKey => {
    return this.childrenNodeTypeMap[sceneKey];
  };
  _setChildrenNodeType = (sceneKey, nodeType) => {
    this.childrenNodeTypeMap[sceneKey] = nodeType;
  };
  childrenNodeRerenderMap = {};
  _getChildrenNodeRerender = sceneKey => {
    return this.childrenNodeRerenderMap[sceneKey] || (() => {});
  };
  _setChildrenNodeRerender = (sceneKey, rerender) => {
    this.childrenNodeRerenderMap[sceneKey] = rerender;
  };

  // for lazy render scene content
  componentDidMount() {
    // render default scene
    const {
      defaultSceneKey,
      addVisitedSceneKey,
      _getChildrenNodeRerender,
      _setActiveSceneKey,
    } = this;
    const rerenderDefaultChild = _getChildrenNodeRerender(defaultSceneKey);

    _setActiveSceneKey(defaultSceneKey);
    addVisitedSceneKey(defaultSceneKey);
    if (rerenderDefaultChild) {
      rerenderDefaultChild();
    }
  }
  _rerenderChildrenOfVisitedTabs = sceneKey => {
    const { isVisited, addVisitedSceneKey, _getChildrenNodeRerender } = this;
    const hasVisited = isVisited(sceneKey);
    if (!hasVisited) {
      const rerender = _getChildrenNodeRerender(sceneKey);
      addVisitedSceneKey(sceneKey);
      if (rerender) {
        rerender();
      }
    }
  };
  _handleHeaderLayoutChange = ({ height, stickBarHeight }) => {
    this.setState({
      headerHeight: height,
      stickBarHeight: stickBarHeight,
    });
  };
  _handleScrollStopInternal = (handlingSceneKey, offset) => {
    const {
      scrollNodes,
      _getCachedScrollOffset,
      _getFoldableHeaderOffset,
      _setHeaderOffset,
    } = this;

    const foldableHeaderOffset = _getFoldableHeaderOffset();

    const headerOffset = calcHeaderOffset(offset, foldableHeaderOffset);
    _setHeaderOffset(headerOffset);

    console.log('cached', this.cachedScrollOffsetMap);
    console.log('new', this.alterScrollOffsetMap);
    const scrollNodeSceneKeys = Object.keys(scrollNodes);
    scrollNodeSceneKeys.forEach(sceneKey => {
      const cachedScrollOffset = _getCachedScrollOffset(sceneKey);
      const alterOffset =
        handlingSceneKey === sceneKey
          ? offset
          : calcAlterScrollOffset(
              headerOffset,
              foldableHeaderOffset,
              cachedScrollOffset
            );
      this._setAlterScrollOffset(sceneKey, alterOffset);
      // not scroll target that response to scroll event
      if (handlingSceneKey === sceneKey) {
        return;
      }
      const node = scrollNodes[sceneKey];
      if (node) {
        // scrollToOffset will trigger onScroll event
        console.log('scroll to', sceneKey, alterOffset);
        node.scrollToOffset({
          animated: false,
          offset: alterOffset,
        });
      }
    });
  };
  _handleScrollStop = sceneKey => {
    let timerHandler = null;
    return e => {
      // The purpose of debounds is to aviod affect header's transform
      // since `scrollToOffset` caused frequent onScroll event response.
      const { _getActiveSceneKey, _handleScrollStopInternal } = this;
      if (_getActiveSceneKey() !== sceneKey) {
        // only handle active scene list's onScroll event
        return;
      }

      // react-native cann't conditional Animated.event
      // reduce the number of times the scroll event is triggered via debounds
      if (timerHandler !== null) {
        clearTimeout(timerHandler);
      }
      // nativeEvent can only access synchronously
      const { nativeEvent } = e;
      const offset = nativeEvent.contentOffset.y;

      // 100ms is the ideal interval for 2 consecutive operations
      timerHandler = setTimeout(() => {
        _handleScrollStopInternal(sceneKey, offset);
      }, 100);
    };
  };
  _renderChildren = children => {
    const {
      _setScrollNode,
      _handleScrollStop,
      scrollOffsetAnimatedValue,
      _partRenderableChildrenType,
    } = this;
    const { onScroll: proxyOnScroll } = this.props;
    const { headerHeight } = this.state;
    const ChildrenTypes = _partRenderableChildrenType(children);
    return React.Children.map(children, (child, index) => {
      const sceneKey = makeSceneKey(child, index);
      const handleScroll = _handleScrollStop(sceneKey);

      const DirectAnimatedVirtualizedList =
        ChildrenTypes[index] || Animated[child.type.name];
      console.log(
        'DirectAnimatedVirtualizedList',
        DirectAnimatedVirtualizedList
      );
      return (
        <DirectAnimatedVirtualizedList
          {...child.props}
          ref={node => {
            // todo check ref api
            // child.props.ref(node)
            console.log('ref xx', node);
            // set scrollNodes
            _setScrollNode(sceneKey, node ? node._component : null);
          }}
          ListHeaderComponent={
            <View
              style={{
                height: headerHeight,
              }}
            />
          }
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [
              {
                nativeEvent: {
                  contentOffset: {
                    y: scrollOffsetAnimatedValue,
                  },
                },
              },
            ],
            {
              useNativeDriver: true,
              listener: e => {
                // proxy onScroll
                if (proxyOnScroll) {
                  proxyOnScroll(e);
                }
                console.log('evt', e.nativeEvent);
                handleScroll(e);
              },
            }
          )}
        />
      );
    });
  };
  render() {
    const {
      _memo,
      _setCachedScrollOffset,
      _handleHeaderLayoutChange,
      _renderChildren,
      scrollOffsetAnimatedValue,
    } = this;
    const {
      header = null,
      renderTabBar,
      children,
      style,
      initialPage,
    } = this.props;

    const [TabBar, rerenderTabBar] = _memo(
      'TabBar@render',
      () => withDirect(renderTabBar),
      [renderTabBar]
    );

    return (
      <View
        style={{
          ...style,
          position: 'relative',
          flexGrow: 1,
        }}
      >
        <HeaderContainer
          scrollOffsetAnimatedValue={scrollOffsetAnimatedValue}
          onLayoutChange={_handleHeaderLayoutChange}
        >
          {header}
          <TabBar />
        </HeaderContainer>
        <ScrollableTabView
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          renderTabBar={props => {
            rerenderTabBar(props);
            return <View />;
          }}
          initialPage={initialPage}
          onChangeTab={({ i, ref }) => {
            const {
              _getAlterScrollOffset,
              _getActiveSceneKey,
              _setActiveSceneKey,
              _rerenderChildrenOfVisitedTabs,
            } = this;
            const lastSceneKey = _getActiveSceneKey();
            _setCachedScrollOffset(
              lastSceneKey,
              _getAlterScrollOffset(lastSceneKey)
            );

            const activeSceneKey = makeSceneKey(ref, i);
            _setActiveSceneKey(activeSceneKey);

            _rerenderChildrenOfVisitedTabs(activeSceneKey);
          }}
        >
          {_renderChildren(children)}
        </ScrollableTabView>
      </View>
    );
  }
}

StickableTabView.defaultProps = {
  header: null,
  renderTabBar: () => <DefaultTabBar />,
  children: null,
  style: {},
  initialPage: 0,
};

export default StickableTabView;

function withDirect(WrapedComponment, prerender = false) {
  let shouldRender = false;
  // TODO: if component's render after call rerender
  const rerenderRef = {
    current: () => {
      console.log('listen');
    },
  };
  class C extends PureComponent {
    state = {
      supplementProps: {},
    };
    lastSupplementProps = this.state.supplementProps;
    _setLastSupplementProps = (val) => {
      this.lastSupplementProps = val;
    };
    _getLastSupplementProps = () => {
      return this.lastSupplementProps;
    };
    render() {
      let alterProps = {};
      const { props, _setLastSupplementProps, _getLastSupplementProps } = this;
      const { supplementProps } = this.state;

      const { forwardedRef } = props;
      if (_getLastSupplementProps() === supplementProps) {
        // rerender without call rerender funciton
        alterProps = { ...supplementProps, ...props };
      } else {
        _setLastSupplementProps(supplementProps);
        alterProps = { ...props, ...supplementProps };
      }

      rerenderRef.current = (externalProps = {}) => {
        shouldRender = true;
        console.log('listen iner');
        console.log('externalProps', externalProps);
        this.setState({
          supplementProps: { ...externalProps },
        });
      };

      const isRender = prerender || shouldRender;
      console.log('listen alterProps', alterProps);

      return isRender ? <WrapedComponment {...alterProps} ref={forwardedRef} /> : null;
    }
  }
  return [
    React.forwardRef((props, ref) => {
      return <C {...props} forwardedRef={ref} />;
    }),
    (...args) => {
      rerenderRef.current(...args);
    },
  ];
}
