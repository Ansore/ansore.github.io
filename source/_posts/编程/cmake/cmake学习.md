---
title: cmake学习
tags:
  - cmake
categories:
  - 编程
abbrlink: 72bbddf7
date: 2022-03-20 09:52:44
---

# 变量

## 预定义变量

```cmake
PROJECT_SOURCE_DIR       # 工程的根目录
PROJECT_BINARY_DIR       # 运行 cmake 命令的目录，通常是 ${PROJECT_SOURCE_DIR}/build 
PROJECT_NAME             # 返回通过 project 命令定义的项目名称
CMAKE_CURRENT_SOURCE_DIR # 当前处理的 CMakeLists.txt 所在的路径
CMAKE_CURRENT_BINARY_DIR # target 编译目录
CMAKE_CURRENT_LIST_DIR   # CMakeLists.txt 的完整路径
CMAKE_CURRENT_LIST_LINE  # 当前所在的行
CMAKE_MODULE_PATH        # 定义自己的 cmake 模块所在的路径，SET(CMAKE_MODULE_PATH ${PROJECT_SOURCE_DIR}/cmake)，然后可以用INCLUDE命令来调用自己的模块
EXECUTABLE_OUTPUT_PATH   # 重新定义目标二进制可执行文件的存放位置
LIBRARY_OUTPUT_PATH      # 重新定义目标链接库文件的存放位置
```

## 环境变量

```cmake
# 使用环境变量
$ENV{Name}

# 写入环境变量, 这里没有`$`符号
set(ENV{Name} value)
```

## 系统信息

```cmake
CMAKE_MAJOR_VERSION    # cmake 主版本号, 比如 3.4.1 中的 3
CMAKE_MINOR_VERSION    # cmake 次版本号，比如 3.4.1 中的 4
CMAKE_PATCH_VERSION    # cmake 补丁等级，比如 3.4.1 中的 1
CMAKE_SYSTEM           # 系统名称，比如 Linux-­2.6.22
CMAKE_SYSTEM_NAME      # 不包含版本的系统名，比如 Linux
CMAKE_SYSTEM_VERSION   # 系统版本，比如 2.6.22
CMAKE_SYSTEM_PROCESSOR # 处理器名称，比如 i686
UNIX                   # 在所有的类 UNIX 平台下该值为 TRUE，包括 OS X 和 cygwin
WIN32                  # 在所有的 win32 平台下该值为 TRUE，包括 cygwin
```

## 主要开关选项

```cmake
# 这个开关用来控制默认的库编译方式，如果不进行设置，使用 add_library 又没有指定库类型的情况下，默认编译生成的库都是静态库。
# 如果 set(BUILD_SHARED_LIBS ON) 后，默认生成的为动态库
BUILD_SHARED_LIBS 

# 设置 C 编译选项，也可以通过指令 add_definitions() 添加
CMAKE_C_FLAGS     

# 设置 C++ 编译选项，也可以通过指令 add_definitions() 添加
CMAKE_CXX_FLAGS   

# exp: 参数之间用空格分隔
add_definitions(-DENABLE_DEBUG -DABC) 
```

# 语法

## `set`设置变量

```cmake
# 1、set 直接设置变量的值
set(SRC_LIST main.cpp test.cpp)
add_executable(demo ${SRC_LIST})

# 2、set 追加设置变量的值
set(SRC_LIST main.cpp)
set(SRC_LIST ${SRC_LIST} test.cpp)
add_executable(demo ${SRC_LIST})

# 3、list 追加或者删除变量的值
set(SRC_LIST main.cpp)
list(APPEND SRC_LIST test.cpp)
list(REMOVE_ITEM SRC_LIST main.cpp)
add_executable(demo ${SRC_LIST})

# Reading
list(LENGTH <list> <out-var>)                            # 返回list的长度
list(GET <list> <element index> [<index> ...] <out-var>) # 返回list中index的element到value中
list(JOIN <list> <glue> <out-var>)
list(SUBLIST <list> <begin> <length> <out-var>)

# Search
list(FIND <list> <value> <out-var>)

# Modification
list(APPEND <list> [<element>...])                       # 添加新element到list中
list(FILTER <list> {INCLUDE | EXCLUDE} REGEX <regex>)
list(INSERT <list> <index> [<element>...])
list(POP_BACK <list> [<out-var>...])
list(POP_FRONT <list> [<out-var>...])
list(PREPEND <list> [<element>...])
list(REMOVE_ITEM <list> <value>...)
list(REMOVE_AT <list> <index>...)
list(REMOVE_DUPLICATES <list>)                          # 从list中删除重复的element
list(TRANSFORM <list> <ACTION> [...])

# Ordering
list(REVERSE <list>)
list(SORT <list> [...])
```

## `if`条件控制

```cmake
# 1、逻辑判断和比较：
if (expression)                  # expression 不为空（0,N,NO,OFF,FALSE,NOTFOUND）时为真
if (not exp)                     # 与上面相反
if (var1 AND var2)               # 与
if (var1 OR var2)                # 或
if (COMMAND cmd)                 # 如果 cmd 确实是命令并可调用为真
if (EXISTS dir)/if (EXISTS file) # 如果目录或文件存在为真
if (file1 IS_NEWER_THAN file2)   # 当 file1 比 file2 新，或 file1/file2 中有一个不存在时为真，文件名需使用全路径
if (IS_DIRECTORY dir)            # 当 dir 是目录时为真
if (DEFINED var)                 # 如果变量被定义为真
if (var MATCHES regex)           # 给定的变量或者字符串能够匹配正则表达式 regex 时为真，此处 var 可以用 var 名，也可以用 ${var}
if (string MATCHES regex)        # 同上

# 2、数字比较：
if (variable LESS number)        # LESS 小于
if (string LESS number)
if (variable GREATER number)     # GREATER 大于
if (string GREATER number)
if (variable EQUAL number)       # EQUAL 等于
if (string EQUAL number)

# 3、字母表顺序比较：
if (variable STRLESS string)
if (string STRLESS string)
if (variable STRGREATER string)
if (string STRGREATER string)
if (variable STREQUAL string)
if (string STREQUAL string)

# 4、示例
if(${CMAKE_BUILD_TYPE} MATCHES "debug")
    ...
endif()

if(UNIX)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++11 -fpermissive -g")
else()
    add_definitions(-D_SCL_SECURE_NO_WARNINGS
    -D_CRT_SECURE_NO_WARNINGS
    -D_WIN32_WINNT=0x601
    -D_WINSOCK_DEPRECATED_NO_WARNINGS)
endif()
```

## `while`循环语句

```cmake
while(condition)
    ...
endwhile()
```

## `foreach`循环语句

```cmake
# start 表示起始数，stop 表示终止数，step 表示步长
foreach(loop_var RANGE start stop [step])
    ...
endforeach(loop_var)

# 示例(输出：1、3、5、7、9)
foreach(i RANGE 1 9 2)
    message(${i})
endforeach(i)
```

## `macro`宏定义

```cmake
# MACRO: 用宏来实现封装，自定义一个命令
# 宏的ARGN、ARGV等参数不是通常CMake意义上的变量。 它们是字符串替换，很像C预处理器对宏的处理。

# ARGV	是一个下标，0指向第一个参数，累加
# ARGV	所有的定义时要求传入的参数
# ARGN	定义时要求传入的参数以外的参数，比如定义宏（函数）时，要求输入1个，书记输入了3个，则剩下的两个会以数组形式存储在ARGN中
# ARGC	传入的实际参数的个数，也就是调用函数是传入的参数个数
MACRO(<name> [arg1 [arg2 [arg3 ...]]])
    COMMAND1(ARGS ...)
    COMMAND2(ARGS ...)
    ...
ENDMACRO(<name>)

# 定义一个宏，用来简化测试工作
macro (do_test arg1 arg2 result)
  add_test (test_${arg1}_${arg2} Demo ${arg1} ${arg2})
  set_tests_properties (test_${arg1}_${arg2}
    PROPERTIES PASS_REGULAR_EXPRESSION ${result})
endmacro (do_test)
 
# 使用该宏进行一系列的数据测试
do_test (5 2 "is 25")
do_test (10 5 "is 100000")
do_test (2 10 "is 1024")
```

## `function`函数

```cmake
# function: 用函数来实现封装，自定义一个命令
function(<name> [<arg1> ...])
  <commands>
endfunction()

# 定义一个简单的打印函数
function(_foo)
    foreach(arg IN LISTS ARGN)
        message(STATUS "this in function is ${arg}")
    endforeach()
endfunction()

_foo(a b c)
# this in function is a
# this in function is b
# this in function is c
```

# 命令

## 指定`cmake`的最小版本

```cmake
cmake_minimum_required(VERSION3.4.1)
```

## 设置项目名称

```cmake
# 这个命令不是强制性的，但最好都加上。它会引入两个变量 demo_BINARY_DIR 和 demo_SOURCE_DIR，
# 同时，cmake 自动定义了两个等价的变量 PROJECT_BINARY_DIR 和 PROJECT_SOURCE_DIR。
project(demo)
```

## 设置编译类型

```cmake
add_executable(demo demo.cpp)       # 生成可执行文件
add_library(common STATIC util.cpp) # 生成静态库
add_library(common SHARED util.cpp) # 生成动态库或共享库

# add_library 默认生成是静态库，通过以上命令生成文件名字，
# 在 Linux 下是：demo、libcommon.a、libcommon.so
# 在 Windows 下是：demo.exe、common.lib、common.dll
```

## 指定编译包含的源文件

```cmake
# 1、明确指定包含哪些源文件
add_library(demo demo.cpp test.cpp util.cpp)

# 2、发现一个目录下所有的源代码文件并将列表存储在一个变量中
aux_source_directory(dir VAR)

# exp:搜索当前目录下的所有.cpp文件
aux_source_directory(. SRC_LIST)
add_library(demo ${SRC_LIST})

# 3、自定义搜索规则
file(GLOB SRC_LIST "*.cpp" "protocol/*.cpp")
add_library(demo ${SRC_LIST})

# 或者
file(GLOB SRC_LIST "*.cpp")
file(GLOB SRC_PROTOCOL_LIST "protocol/*.cpp")
add_library(demo ${SRC_LIST} ${SRC_PROTOCOL_LIST})

# 或者
file(GLOB_RECURSE SRC_LIST "*.cpp") # 递归搜索
file(GLOB SRC_PROTOCOL RELATIVE "protocol" "*.cpp") # 相对protocol目录下搜索
add_library(demo ${SRC_LIST} ${SRC_PROTOCOL_LIST})

# 或者
aux_source_directory(. SRC_LIST)
aux_source_directory(protocol SRC_PROTOCOL_LIST)
add_library(demo ${SRC_LIST} ${SRC_PROTOCOL_LIST})
```

## 查找指定的库文件

```cmake
# 查找到指定的预编译库，并将它的路径存储在变量中。
# 默认的搜索路径为 cmake 包含的系统库，因此如果是 NDK 的公共库只需要指定库的 name 即可。
find_library(VAR name path) 

# 类似的命令还有 find_file()、find_path()、find_program()、find_package()。
find_library( # Sets the name of the path variable.
              log-lib

              # Specifies the name of the NDK library that
              # you want CMake to locate.
              log )
```

## 设置包含的目录

```cmake
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_BINARY_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# Linux 下还可以通过如下方式设置包含的目录
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -I${CMAKE_CURRENT_SOURCE_DIR}")


# Add a subdirectory to the build.（添加一个子目录并构建该子目录。）
add_subdirectory(source_dir [binary_dir] [EXCLUDE_FROM_ALL])
```

## 设置链接库搜索目录

```cmake
link_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/libs
)

# Linux 下还可以通过如下方式设置包含的目录
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -L${CMAKE_CURRENT_SOURCE_DIR}/libs")
```

## 设置 `target`需要链接的库

```cmake
# 在 Windows 下，系统会根据链接库目录，搜索xxx.lib 文件，
# Linux 下会搜索 xxx.so 或者 xxx.a 文件，如果都存在会优先链接动态库（so 后缀）。
target_link_libraries( # 目标库
                       demo
 
                       # 目标库需要链接的库
                       # log-lib 是上面 find_library 指定的变量名
                       ${log-lib} )

# 1、指定链接动态库或静态库
target_link_libraries(demo libface.a)  # 链接libface.a
target_link_libraries(demo libface.so) # 链接libface.so

# 2、指定全路径
target_link_libraries(demo ${CMAKE_CURRENT_SOURCE_DIR}/libs/libface.a)
target_link_libraries(demo ${CMAKE_CURRENT_SOURCE_DIR}/libs/libface.so)

# 3、指定链接多个库
target_link_libraries(demo
    ${CMAKE_CURRENT_SOURCE_DIR}/libs/libface.a
    boost_system.a
    boost_thread
    pthread
)
```

## 打印信息

```cmake
message(${PROJECT_SOURCE_DIR})
message("build with debug mode")
message(WARNING "this is warnning message")

# FATAL_ERROR 会导致编译失败
message(FATAL_ERROR "this build has many error") 
```

## 包含其它`cmake`文件

```cmake
include(./common.cmake) # 指定包含文件的全路径
include(def)            # 在搜索路径中搜索def.cmake文件

# 设置include的搜索路径
set(CMAKE_MODULE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/cmake) 
```

## 文件操作

```cmake
# 将 <input> 文件里面的内容全部复制到 <output> 文件中；
# 根据参数规则，替换 @VAR@ 或 ${VAR} 变量；
configure_file(<input> <output>
               [NO_SOURCE_PERMISSIONS | USE_SOURCE_PERMISSIONS |
                FILE_PERMISSIONS <permissions>...]
               [COPYONLY] [ESCAPE_QUOTES] [@ONLY]
               [NEWLINE_STYLE [UNIX|DOS|WIN32|LF|CRLF] ])

# Copies an <input> file to an <output> file and substitutes variable values referenced as @VAR@ or ${VAR} in the input file content. 
# Each variable reference will be replaced with the current value of the variable, 
# or the empty string if the variable is not defined. Furthermore, input lines of the form

# Reading
file(READ <filename> <out-var> [...])
file(STRINGS <filename> <out-var> [...])
file(<HASH> <filename> <out-var>)
file(TIMESTAMP <filename> <out-var> [...])
file(GET_RUNTIME_DEPENDENCIES [...])

# Writing
file({WRITE | APPEND} <filename> <content>...)
file({TOUCH | TOUCH_NOCREATE} [<file>...])
file(GENERATE OUTPUT <output-file> [...])
file(CONFIGURE OUTPUT <output-file> CONTENT <content> [...])

# Filesystem
file({GLOB | GLOB_RECURSE} <out-var> [...] [<globbing-expr>...])
file(MAKE_DIRECTORY [<dir>...])
file({REMOVE | REMOVE_RECURSE } [<files>...])
file(RENAME <oldname> <newname> [...])
file(COPY_FILE <oldname> <newname> [...])
file({COPY | INSTALL} <file>... DESTINATION <dir> [...])
file(SIZE <filename> <out-var>)
file(READ_SYMLINK <linkname> <out-var>)
file(CREATE_LINK <original> <linkname> [...])
file(CHMOD <files>... <directories>... PERMISSIONS <permissions>... [...])
file(CHMOD_RECURSE <files>... <directories>... PERMISSIONS <permissions>... [...])

# Path Conversion
file(REAL_PATH <path> <out-var> [BASE_DIRECTORY <dir>] [EXPAND_TILDE])
file(RELATIVE_PATH <out-var> <directory> <file>)
file({TO_CMAKE_PATH | TO_NATIVE_PATH} <path> <out-var>)

# Transfer
file(DOWNLOAD <url> [<file>] [...])
file(UPLOAD <file> <url> [...])

# Locking
file(LOCK <path> [...])

# Archiving
file(ARCHIVE_CREATE OUTPUT <archive> PATHS <paths>... [...])
file(ARCHIVE_EXTRACT INPUT <archive> [...])
```

## 编译选项

```cmake
# CMake 允许为项目增加编译选项，从而可以根据用户的环境和需求选择最合适的编译方案。
# Provide an option that the user can optionally select.
option(<variable> "<help_text>" [value])

# Provides an option for the user to select as ON or OFF. 
# If no initial <value> is provided, OFF is used. 
# If <variable> is already set as a normal or cache variable, then the command does nothing (see policy CMP0077).

# 将预处理器定义添加到源文件的编译中。
# 预处理器定义被添加到当前CMakeLists文件的COMPILE_DEFINITIONS目录属性中。
# 它们还被添加到当前CMakeLists文件中每个目标的COMPILE_DEFINITIONS目标属性中。
add_compile_definitions(<definition> ...)

# 该命令可用于添加任何选项。向COMPILE_OPTIONS目录属性添加选项。当从当前目录及以下目录编译目标时，将使用这些选项。
# 但是，为了添加预处理器定义和包含目录，建议使用更具体的命令add_compile_definitions()和include_directories()
add_compile_options(<option> ...)
```

# 其他

```cmake
# 1-单独设置某个项目的编译参数等(例如有个动态库为 LIB1)
add_libraries(LIB1 SHARED ${src_lib1})
set_property(TARGET LIB1 PROPERTY POSITION_INDEPENDENT_CODE ON)         # 代表-fPIC
set_property(TARGET LIB1 PROPERTY COMPILE_FLAGS " -DMACRO1 -DMACRO2")   # 定义一些宏

# 2-设置符号可视性(export)
set_target_properties(${obj} PROPERTIES C_VISIBILITY_PRESET hidden)
set_target_properties(${obj} PROPERTIES CXX_VISIBILITY_PRESET hidden)

set(CMAKE_C_VISIBILITY_PRESET hidden)
set(CMAKE_CXX_VISIBILITY_PRESET hidden)
set(CMAKE_C_FLAGS$ "${CMAKE_C_FLAGS} -fvisibility = hidden")
set(CMAKE_CXX_FLAGS$ "${CMAKE_CXX_FLAGS} -fvisibility = hidden")

# 3-同时编静态库(.a)和动态库(.so)
SET_TARGET_PROPERTIES(hello_static PROPERTIES OUTPUT_NAME "hello")
SET_TARGET_PROPERTIES(hello PROPERTIES CLEAN_DIRECT_OUTPUT 1)
SET_TARGET_PROPERTIES(hello_static PROPERTIES CLEAN_DIRECT_OUTPUT 1)

# 4- 使用外部库
# 4-1、find_package(<Name>)命令首先会在模块路径中寻找 Find<name>.cmake，这是查找库的一个典型方式。
# 具体查找路径依次为CMake： 变量${CMAKE_MODULE_PATH}中的所有目录。
# 如果没有，然后再查看它自己的模块目录 /share/cmake-x.y/Modules/ （$CMAKE_ROOT的具体值可以通过CMake中message命令输出）。这称为模块模式。

# 4-2、如果没找到这样的文件，find_package()会在~/.cmake/packages/或/usr/local/share/中的各个包目录中查找，
# 寻找<库名字的大写>Config.cmake 或者 <库名字的小写>-config.cmake 
# (比如库Opencv，它会查找/usr/local/share/OpenCV中的OpenCVConfig.cmake或opencv-config.cmake)。这称为配置模式。

# 不管使用哪一种模式，只要找到*.cmake，*.cmake里面都会定义下面这些变量：
<NAME>_FOUND
<NAME>_INCLUDE_DIRS or <NAME>_INCLUDES
<NAME>_LIBRARIES or <NAME>_LIBRARIES or <NAME>_LIBS
<NAME>_DEFINITIONS

# 注意大部分包的这些变量中的包名是全大写的，如 LIBFOO_FOUND ，有些包则使用包的实际大小写，如 LibFoo_FOUND
# 如果找到这个包，则可以通过在工程的顶层目录中的CMakeLists.txt 文件添加 include_directories(<NAME>_INCLUDE_DIRS) 来包含库的头文件，
# 添加target_link_libraries(源文件 <NAME>_LIBRARIES)命令将源文件与库文件链接起来。
```

# 编译项目

## 单个源文件

假设现在我们的项目中只有一个源文件 [main.cc](http://main.cc/) ，该程序的用途是计算一个数的指数幂。

```c
#include <stdio.h>
#include <stdlib.h>

/**
 * power - Calculate the power of number.
 * @param base: Base value.
 * @param exponent: Exponent value.
 *
 * @return base raised to the power exponent.
 */
double power(double base, int exponent)
{
    int result = base;
    int i;
    
    if (exponent == 0) {
        return 1;
    }
    
    for(i = 1; i < exponent; ++i){
        result = result * base;
    }

    return result;
}

int main(int argc, char *argv[])
{
    if (argc < 3){
        printf("Usage: %s base exponent \n", argv[0]);
        return 1;
    }
    double base = atof(argv[1]);
    int exponent = atoi(argv[2]);
    double result = power(base, exponent);
    printf("%g ^ %d is %g\n", base, exponent, result);
    return 0;
}
```

**编写 CMakeLists.txt**

首先编写 CMakeLists.txt 文件，并保存在与 **[main.cc](http://main.cc/)** 源文件同个目录下：

```cmake'
# CMake 最低版本号要求
cmake_minimum_required (VERSION 2.8)

# 项目信息
project (Demo1)

# 指定生成目标
add_executable(Demo main.cc)
```

CMakeLists.txt 的语法比较简单，由命令、注释和空格组成，其中命令是不区分大小写的。符号 `#` 后面的内容被认为是注释。命令由命令名称、小括号和参数组成，参数之间使用空格进行间隔。

对于上面的 CMakeLists.txt 文件，依次出现了几个命令：

- `cmake_minimum_required`：指定运行此配置文件所需的 CMake 的最低版本；
- `project`：参数值是 `Demo1`，该命令表示项目的名称是 `Demo1` 。
- `add_executable`： 将名为 **[main.cc](http://main.cc/)** 的源文件编译成一个名称为 Demo 的可执行文件。

**编译项目**

之后，在当前目录执行 `cmake .` ，得到 Makefile 后再使用 `make` 命令编译得到 Demo1 可执行文件。

## 多个源文件

现在假如把 power 函数单独写进一个名为 MathFunctions.c 的源文件里，使得这个工程变成如下的形式：

```tex
/Demo2
    |
    +--- main.cc
    |
    +--- MathFunctions.cc
    |
    +--- MathFunctions.h
```

这个时候，CMakeLists.txt 可以改成如下的形式:

```cmake
# CMake 最低版本号要求
cmake_minimum_required (VERSION 2.8)

# 项目信息
project (Demo2)

# 指定生成目标
add_executable(Demo main.cc MathFunctions.cc)
```

唯一的改动只是在 add_executable 命令中增加了一个 MathFunctions.cc 源文件。这样写当然没什么问题，但是如果源文件很多，把所有源文件的名字都加进去将是一件烦人的工作。更省事的方法是使用 aux_source_directory 命令，该命令会查找指定目录下的所有源文件，然后将结果存进指定变量名。其语法如下：

```cmake
aux_source_directory(<dir> <variable>)
```

因此，可以修改 CMakeLists.txt 如下：

```cmake
# CMake 最低版本号要求
cmake_minimum_required (VERSION 2.8)

# 项目信息
project (Demo2)

# 查找当前目录下的所有源文件
# 并将名称保存到 DIR_SRCS 变量
aux_source_directory(. DIR_SRCS)

# 指定生成目标
add_executable(Demo ${DIR_SRCS})
```

这样，CMake 会将当前目录所有源文件的文件名赋值给变量 DIR_SRCS ，再指示变量 DIR_SRCS 中的源文件需要编译成一个名称为 Demo 的可执行文件。

## 多个目录，多个源文件

现在进一步将 MathFunctions.h 和 [MathFunctions.cc](http://mathfunctions.cc/) 文件移动到 math 目录下。

对于这种情况，需要分别在项目根目录 Demo3 和 math 目录里各编写一个 CMakeLists.txt 文件。为了方便，我们可以先将 math 目录里的文件编译成静态库再由 main 函数调用。

根目录中的 CMakeLists.txt ：

```cmake
# CMake 最低版本号要求
cmake_minimum_required (VERSION 2.8)

# 项目信息
project (Demo3)

# 查找当前目录下的所有源文件
# 并将名称保存到 DIR_SRCS 变量
aux_source_directory(. DIR_SRCS)

# 添加 math 子目录
add_subdirectory(math)

# 指定生成目标 
add_executable(Demo main.cc)

# 添加链接库
target_link_libraries(Demo MathFunctions)
```

该文件添加了下面的内容: 第3行，使用命令 `add_subdirectory` 指明本项目包含一个子目录 math，这样 math 目录下的 CMakeLists.txt 文件和源代码也会被处理 。第6行，使用命令 `target_link_libraries` 指明可执行文件 main 需要连接一个名为 MathFunctions 的链接库 。

子目录中的 CMakeLists.txt：

```cmake
# 查找当前目录下的所有源文件
# 并将名称保存到 DIR_LIB_SRCS 变量
aux_source_directory(. DIR_LIB_SRCS)

# 生成链接库
add_library (MathFunctions ${DIR_LIB_SRCS})
```

在该文件中使用命令 add_library 将 src 目录中的源文件编译为静态链接库。