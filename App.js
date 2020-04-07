import React from 'react'

import StickableTabView from './react-native-stickable-tab-view'
import ScrollableTabView, { DefaultTabBar, ScrollableTabBar } from 'react-native-scrollable-tab-view'
import { View, Text, FlatList, ImageBackground } from 'react-native'

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

const Item = ({ title, style = {} }) => (
    <View
        style={[{
            height: 300,
            backgroundColor: getRandomColor(),
            margin: 20,
        }, style]}
    >
        <Text>{title}</Text>
    </View>
)

export default () => {
    return (
        <ScrollableTabView
        renderTabBar={(props) => (<ScrollableTabBar style={{ backgroundColor: '#fff' }} {...props} />)}
    >
        <FlatList
            style={{
                backgroundColor: 'yellow',
                flexGrow: 1,
            }}
            tabLabel="tab 1"
            data={[{ id: 11, title: 'hello1'}, {id: 12, title: 'hello2'  }, {id: 13, title: 'hello3'  },
            {id: 14, title: 'hello3'  }, {id: 15, title: 'hello3'  }, {id: 16, title: 'hello3'  }]}
            renderItem={({ item }) => (<Item {...item} />)}
            keyExtractor={(item) => (item.id)}
        />
        <FlatList
        style={{
            backgroundColor: 'red',
            flexGrow: 1,
        }}
            tabLabel="tab 2"
            data={[{ id: 11, title: 'hello1'}, {id: 12, title: 'hello2'  }, {id: 13, title: 'hello3'  },
            {id: 14, title: 'hello3'  }, {id: 15, title: 'hello3'  }, {id: 16, title: 'hello3'  }]}
            renderItem={({ item }) => (<Item {...item} />)}
            keyExtractor={(item) => (item.id)}
        />
        <FlatList
            style={{
                backgroundColor: 'green',
                flexGrow: 1,
            }}
            tabLabel="tab 3"
            data={[{ id: 11, title: 'hello1'}, {id: 12, title: 'hello2'  }, {id: 13, title: 'hello3'  },
            {id: 14, title: 'hello3'  }, {id: 15, title: 'hello3'  }, {id: 16, title: 'hello3'  }]}
            renderItem={({ item }) => (<Item {...item} />)}
            keyExtractor={(item) => (item.id)}
        />
        <FlatList
            style={{
                backgroundColor: 'green',
                flexGrow: 1,
            }}
            tabLabel="tab 4"
            data={[{ id: 11, title: 'hello1'}, {id: 12, title: 'hello2'  }, {id: 13, title: 'hello3'  },
            {id: 14, title: 'hello3'  }, {id: 15, title: 'hello3'  }, {id: 16, title: 'hello3'  }]}
            renderItem={({ item }) => (<Item {...item} />)}
            keyExtractor={(item) => (item.id)}
        />
        <FlatList
            style={{
                backgroundColor: 'green',
                flexGrow: 1,
            }}
            tabLabel="tab 5"
            data={[{ id: 11, title: 'hello1'}, {id: 12, title: 'hello2'  }, {id: 13, title: 'hello3'  },
            {id: 14, title: 'hello3'  }, {id: 15, title: 'hello3'  }, {id: 16, title: 'hello3'  }]}
            renderItem={({ item }) => (<Item {...item} />)}
            keyExtractor={(item) => (item.id)}
        />
        <FlatList
            style={{
                backgroundColor: 'green',
                flexGrow: 1,
            }}
            tabLabel="tab 6"
            data={[{ id: 11, title: 'hello1'}, {id: 12, title: 'hello2'  }, {id: 13, title: 'hello3'  },
            {id: 14, title: 'hello3'  }, {id: 15, title: 'hello3'  }, {id: 16, title: 'hello3'  }]}
            renderItem={({ item }) => (<Item {...item} />)}
            keyExtractor={(item) => (item.id)}
        />
        <FlatList
            style={{
                backgroundColor: 'green',
                flexGrow: 1,
            }}
            tabLabel="tab 7"
            data={[{ id: 11, title: 'hello1'}, {id: 12, title: 'hello2'  }, {id: 13, title: 'hello3'  },
            {id: 14, title: 'hello3'  }, {id: 15, title: 'hello3'  }, {id: 16, title: 'hello3'  }]}
            renderItem={({ item }) => (<Item {...item} />)}
            keyExtractor={(item) => (item.id)}
        />
        <FlatList
            style={{
                backgroundColor: 'green',
                flexGrow: 1,
            }}
            tabLabel="tab 8"
            data={[{ id: 11, title: 'hello1'}, {id: 12, title: 'hello2'  }, {id: 13, title: 'hello3'  },
            {id: 14, title: 'hello3'  }, {id: 15, title: 'hello3'  }, {id: 16, title: 'hello3'  }]}
            renderItem={({ item }) => (<Item {...item} />)}
            keyExtractor={(item) => (item.id)}
        />
    </ScrollableTabView>
    )
}
